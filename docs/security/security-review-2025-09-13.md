# Hubble Security Review — September 13, 2025

Scope: Full repository review (backend, frontend, MCP servers, Docker/Compose, CI). Environment assumed self‑hosted.

Overall risk: High until critical items below are addressed.

## Executive Summary

Critical risks identified include an unauthenticated MCP HTTP server exposed over the network, a JWT verification fallback that can weaken rate limiting, public share endpoints returning overly broad bookmark data (including internal URLs), and lack of SSRF protections on health checks. Several hardening fixes will materially reduce risk within a day.

## System Overview (for context)

- Backend: Node/Express API with SQLite (`sqlite3`), JWT single‑admin auth, Helmet, rate limiting, Socket.IO. DB path `/data/hubble.db`.
- Frontend: React/Vite; uses DOMPurify for user‑content sanitization.
- MCP: Two implementations (stdio and HTTP). HTTP variant wraps DB ops behind REST endpoints.
- Docker: `docker-compose.yml` runs frontend, backend, and MCP server; backend mounts `/var/run/docker.sock:ro`.

## Findings By Severity

### Critical

1) MCP HTTP server is unauthenticated and externally exposed

- Evidence
  - `mcp-server/mcp-http-server.js` provides REST endpoints with full read/write DB access and no auth.
  - `docker-compose.yml` publishes `9900:9900` mapping (public exposure).
- Impact
  - Remote, unauthenticated callers can list/add/delete bookmarks and enumerate groups; potential pivot into internal infrastructure through data exfiltration and automated actions.
- Recommended fixes (do all)
  - Remove the `9900:9900` port mapping; keep MCP on the internal Docker network only.
  - Add an authentication layer (simple static bearer token via env or mTLS if needed), and restrict CORS.
  - If MCP HTTP is not required in production, do not start that service.
- Example changes
  - docker-compose (remove publish):
    ```yaml
    mcp-server:
      # ports: ["9900:9900"]  # remove in production
      expose:
        - "9900"
    ```
  - Basic token middleware for MCP HTTP:
    ```js
    // before routes
    const TOKEN = process.env.MCP_HTTP_TOKEN;
    app.use((req,res,next)=>{
      if (!TOKEN) return res.status(503).json({error:'Not configured'});
      const hdr = req.headers.authorization || '';
      if (hdr === `Bearer ${TOKEN}`) return next();
      return res.status(401).json({error:'Unauthorized'});
    });
    ```

2) JWT verification with insecure fallback in rate limiter helper

- Evidence
  - `backend/middleware/rateLimiting.js` verifies tokens using `process.env.JWT_SECRET || 'your-secret-key'` only to derive a user key, while issued tokens do not include a stable user id.
- Impact
  - A known fallback secret allows crafted tokens; weakens/defeats rate limiting attribution.
- Recommended fixes
  - Do not verify JWTs here. If you need a key, prefer `req.sessionID` or the token hash already stored in DB, or fall back to IP. If decoding is unavoidable, use `jwt.decode` (no secret) and never accept a fallback secret.
  - Align with `authMiddleware` which reads the real `jwt_secret` from DB.
- Example change
  ```js
  // Replace verification with non-auth metadata extraction or remove entirely
  const decoded = jwt.decode(token); // no secret, for non-security hints only
  req.user = decoded?.userId ? { id: decoded.userId } : null;
  ```

3) Public share endpoints expose internal/sensitive fields

- Evidence
  - `backend/routes/shares-public.js` and `backend/routes/shares.js` return `SELECT b.*` to unauthenticated clients.
- Impact
  - Leaks `internal_url`, environment details, metadata, and other fields that should not be publicly exposed.
- Recommended fixes
  - Whitelist fields for public responses. Return only: `id, title, external_url AS url, description, icon, tags, group_id, environment`.
  - Ensure tags are arrays and all text fields are sanitized before rendering.
- Example query
  ```sql
  SELECT b.id, b.title,
         COALESCE(b.external_url, b.url) AS url,
         b.description, b.icon, b.tags, b.group_id, b.environment
  FROM bookmarks b
  WHERE ...
  ```

4) SSRF risk in health checks

- Evidence
  - `backend/routes/health.js` performs HEAD requests to arbitrary URLs without IP range restrictions.
- Impact
  - Internal network probing and metadata service access via server‑side requests.
- Recommended fixes
  - Resolve hostnames and block private/loopback/link‑local ranges (IPv4 and IPv6).
  - Consider explicit allowlists (e.g., only public FQDNs) or an egress proxy.
  - Enforce `http/https` only and set a strict connect/read timeout (already 5s; keep tight).

### High

5) Duplicate/overlapping share route implementations

- Evidence
  - `shares.js`, `shares-admin.js`, and `shares-public.js` implement overlapping functionality with different crypto/UID strategies.
- Impact
  - Inconsistent security controls and field exposure; harder to maintain.
- Recommendation
  - Consolidate into a single implementation with:
    - `crypto.randomBytes` for IDs/UIDs
    - centralized field whitelists for public vs. admin
    - common validation and authorization flow

6) Default/demo shared view seeded in migration

- Evidence
  - `backend/database/migrations/002_sharing_system.sql` inserts `uid = 'demo2024'`.
- Impact
  - Unintended public share present by default.
- Recommendation
  - Remove demo data from migrations; provide a dev seed script only.

7) Backend container runs as root; world‑writable data dir

- Evidence
  - `backend/Dockerfile` sets `/data` to `chmod 777` and uses default root user.
- Impact
  - Elevates risk if container compromised; easier lateral movement.
- Recommendation
  - Create non‑root user, `chown -R`, and restrict perms (e.g., 750). Add `USER node`.

### Medium

8) No request size limits

- Evidence
  - `express.json()` and `urlencoded()` used without `limit` in `backend/server.js`.
- Risk
  - Potential DoS via large bodies.
- Recommendation
  - Add e.g., `express.json({ limit: '1mb' })` and `express.urlencoded({ limit: '1mb', extended: true })`.

9) Rate limit store is in‑memory

- Evidence
  - Custom store in `backend/middleware/rateLimiting.js`.
- Risk
  - Not resilient across processes or restarts.
- Recommendation
  - Use Redis store if you scale horizontally.

10) Docker socket mounted in backend

- Evidence
  - `/var/run/docker.sock:ro` in compose.
- Risk
  - Increases blast radius in case of RCE.
- Recommendation
  - Mount only when `DOCKER_DISCOVERY_ENABLED=true` and only in environments where discovery is required; otherwise remove.

### Low / Informational

- CORS deviations between dev/prod are sane but ensure `CORS_ORIGINS` is strictly set in production.
- Frontend debug component (`AppDebug.tsx`) calls `localhost` APIs; ensure it’s not reachable in production builds.
- Positive: Use of DOMPurify; parameterized SQL; centralized validation; Helmet; structured error responses.

## Immediate Action Plan (24–48 hours)

- [ ] Remove MCP HTTP public exposure; add auth if it must remain.
- [ ] Eliminate JWT fallback secret in limiter; stop verifying JWTs in rate limit context.
- [ ] Whitelist public share fields (exclude `internal_url`, metadata).
- [ ] Add body size limits to Express.
- [ ] Run backend container as non‑root; fix `/data` perms.
- [ ] Remove demo shared view from production migrations.

## Near‑Term (1–2 weeks)

- [ ] Implement SSRF protections (deny private IP ranges, DNS re‑resolution checks).
- [ ] Consolidate share routes and unify crypto/random ID generation.
- [ ] Introduce a validated config module (fail‑fast on missing/weak values).
- [ ] Optionally move rate limit state to Redis.
- [ ] Add tests covering: public field exposure, SSRF guard, CORS behavior, and auth flows.

## Suggested Patches (snippets)

1) Express body limits (backend/server.js)
```js
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

2) Rate limiting helper (stop verifying JWT)
```js
// backend/middleware/rateLimiting.js
const extractUserForRateLimit = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  req.user = null; // default
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Optional: non-security decode only
    try { const jwt = require('jsonwebtoken'); req.user = jwt.decode(token) || null; }
    catch { /* ignore */ }
  }
  next();
};
```

3) Public share whitelist
```sql
SELECT b.id,
       b.title,
       COALESCE(b.external_url, b.url) AS url,
       b.description,
       b.icon,
       b.tags,
       b.group_id,
       b.environment
FROM bookmarks b
-- add filters
```

4) Dockerfile hardening (backend)
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN groupadd -r app && useradd -r -g app app
RUN mkdir -p /data && chown -R app:app /data && chmod 750 /data
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER app
EXPOSE 5000
CMD ["node", "server.js"]
```

5) MCP HTTP server protection
```js
// mcp-server/mcp-http-server.js
const cors = require('cors');
const ALLOW = (process.env.MCP_HTTP_CORS || '').split(',').filter(Boolean);
app.use(cors({ origin: (o,cb)=> ALLOW.length===0?cb(null,false):cb(null, ALLOW.includes(o)) }));
const TOKEN = process.env.MCP_HTTP_TOKEN;
app.use((req,res,next)=>{
  if (!TOKEN) return res.status(503).json({error:'Not configured'});
  if ((req.headers.authorization||'') === `Bearer ${TOKEN}`) return next();
  return res.status(401).json({error:'Unauthorized'});
});
```

6) SSRF guard (pattern)
```js
// Resolve hostname and block private IP ranges before making requests
const net = require('net'); const dns = require('dns').promises;
function isPrivate(ip) {
  // implement checks for 10/8, 172.16/12, 192.168/16, 127/8, ::1, fc00::/7, fe80::/10, 169.254/16
}
async function assertPublicHost(url) {
  const { hostname } = new URL(url);
  const addrs = await dns.lookup(hostname, { all: true });
  if (addrs.some(a => isPrivate(a.address))) throw new Error('Blocked internal address');
}
```

## Configuration Recommendations

- Set and validate at startup:
  - `AUTH_ENABLED`, `DATABASE_URL`, `PUBLIC_DOMAIN`, `CORS_ORIGINS` (prod), `JWT_SECRET` (set automatically on first setup), `DOCKER_DISCOVERY_ENABLED`.
- For MCP HTTP (if kept): `MCP_HTTP_TOKEN`, `MCP_HTTP_CORS`.

## Positive Observations

- Use of parameterized SQL and input validation via `express-validator`.
- DOMPurify for sanitizing HTML on the frontend.
- Helmet enabled; error handler sanitizes responses; 401/403 differentiation is in place.
- JWT secret stored in DB and set during first‑run setup (good pattern); CSRF header check on auth routes.

---

Prepared by: Security review bot
Date: 2025‑09‑13

