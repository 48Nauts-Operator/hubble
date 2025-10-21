# Hubble Product Website — Design Concept (v0.1)

Status: Draft • Date: 2025-09-13 • Owner: Web

---

## Executive Summary

Hubble is a modern, self‑hosted bookmark dashboard for developers and teams with MCP integration, Docker service discovery, authentication, sharing, and analytics. The public website should clearly communicate this value, convert interested visitors into adopters (clone repo, run Docker Compose, star the project), and support ongoing community growth.

Primary goals (in order):
- Convert to “Run locally” (Docker Compose) and GitHub stars.
- Showcase differentiators: MCP automation, Docker discovery, developer‑first UX, sharing.
- Provide frictionless docs and examples to first value in < 5 minutes.
- Establish credible, distinctive brand aligned with mint + royal navy palette.

Primary audiences:
- Developers/tech leads setting up project dashboards.
- DevOps/SRE maintaining service links across environments.
- Self‑host / OSS adopters seeking lightweight, private tools.

Key KPIs (90 days):
- +30% GitHub stars; +25% unique docs visits; 20% of visitors reach “docker-compose up”.

---

## Information Architecture

Top navigation (left → right):
- Product, Features, Integrations, Docs, Deploy, Roadmap, Community
- Right rail CTAs: GitHub (Star count), “Run with Docker”, “Live Demo”

Footer:
- Docs, API, Changelog, Security, License (CC BY‑NC 4.0), Privacy, Contact, Status (future)

Secondary surfaces:
- Blog (optional), Showcase (community setups), Comparisons (vs Homarr/Heimdall)

---

## Page Templates & Content

### 1) Home (Landing)
Purpose: Message clarity + fast path to install.

Hero
- Headline: “Bring Clarity to Your Endpoints.”
- Sub: “An intelligent, self‑hosted bookmark dashboard for modern dev teams — with MCP automation and Docker discovery.”
- Primary CTA: “Run with Docker” (copy button). Secondary: “View Live Demo”. Tertiary: “Star on GitHub”.
- Visual: Large dashboard screenshot with subtle parallax; light/dark toggle.

Pillars (3‑up)
- Organize: Groups, tags, search, drag & drop.
- Automate: Model Context Protocol (MCP) for programmatic bookmarks.
- Share: Public/time‑boxed links, QR codes, analytics.

Code‑first section (tabbed)
- Tabs: “Docker Compose”, “MCP Snippet”, “REST API”. Copy‑to‑clipboard.

Discovery highlight
- Animated flow: Container starts → Detected → Bookmark appears → Live status.

Trust & OSS
- Badges: “Docker Ready”, “MCP Compatible”, license, latest release, star count.

Callouts
- Authentication & Security, Backup/Restore, Realtime sync.

Final CTA band
- “Get Hubble running in minutes.” + Compose block + Docs link.

### 2) Features
- Deep dives with visuals: Organization, MCP, Docker discovery, Sharing, Auth, Analytics.
- Each feature: problem → solution → snippet → screenshot.

### 3) Integrations
- Cards: MCP (Claude/clients), Docker, Nginx reverse proxy, QR/Sharing, future browser extensions.
- Each card links to a focused doc/how‑to.

### 4) Docs (SSG)
- Quickstart, Configuration, MCP how‑to, Docker labels, Auth, Sharing, Backup/Restore, API, Changelog.
- Mirrors repo docs; auto‑imports `README.md` and `CHANGELOG.md`.

### 5) Deploy
- OS‑agnostic docker‑compose + env guide; Nginx examples; security best practices.

### 6) Roadmap & Changelog
- Roadmap summary + live import of `CHANGELOG.md` entries.

### 7) Community
- Contributing, Discussions, Issue templates; showcase grid of community dashboards.

---

## Visual Identity & Design System

Color tokens (HSL)
- Navy: `--navy-950: 223 47% 15%` • `--navy-900: 223 40% 18%` • `--navy-800: 223 35% 22%`
- Mint (primary): `--mint-500: 165 82% 51%` • `--mint-600: 165 85% 45%`
- Accent (coral): `--coral-500: 12 85% 62%` (sparingly for highlights)
- Neutral: `--zinc-200: 240 6% 90%` • `--zinc-400: 240 4% 70%`

Typography
- Display/Body: Inter; Mono: JetBrains Mono. Scale: 12 → 48 px.

Components
- Buttons: Primary (mint solid), Secondary (outline), Ghost.
- Cards: Feature cards with icon, small code snippet, link.
- Code blocks: Copy button, language tabs, dark theme by default.
- Announcement badge (top): release notes/important setup.

Motion
- Subtle hover/fade/slide (Framer Motion). Respect `prefers-reduced-motion`.

Accessibility
- WCAG 2.2 AA; focus rings, skip links, keyboard nav, color contrast ≥ 4.5:1.

---

## Copy Guide (First Pass)

Tagline options
- “Bring Clarity to Your Endpoints.”
- “The Intelligent Bookmark Dashboard for Dev Teams.”

Value bullets
- Centralize every project URL across environments.
- Automate link management with MCP.
- Discover Docker services automatically.
- Share curated views with a single link.

CTAs
- Primary: Run with Docker
- Secondary: Live Demo
- Tertiary: Star on GitHub

---

## Technical Approach

Architecture
- Static‑first site with islands: Astro + React components (for interactivity and code tabs).
- Styling: Tailwind + Radix primitives; reuse app brand tokens for consistency.
- Content: MDX via Astro Content Collections; auto‑ingest repo docs and CHANGELOG.

Performance
- Targets: LCP < 1.5s on 4G; CLS < 0.05; TBT < 200ms.
- Optimizations: preconnect to GitHub, image optimization, responsive screenshots, SVG icons, partial hydration.

Analytics & Telemetry
- Privacy‑friendly (Plausible/Umami) with opt‑out; no invasive trackers.

SEO & Social
- Descriptive titles, meta, canonical; OpenGraph/Twitter images; structured data (SoftwareApplication).

Hosting & CI/CD
- Cloudflare Pages or Netlify; GitHub Actions to build on main; preview deployments for PRs.

---

## Sample Content Blocks

Hero (pseudo‑markup)
```
<h1>Bring Clarity to Your Endpoints</h1>
<p>An intelligent, self‑hosted bookmark dashboard for modern dev teams — with MCP automation and Docker discovery.</p>
[ Run with Docker ]  [ Live Demo ]  [ ⭐ Star ]
```

Docker Compose (copy‑friendly)
```yaml
services:
  hubble:
    image: ghcr.io/48nauts-operator/hubble:latest
    ports:
      - "8888:8888"  # Frontend
      - "8889:8889"  # API
    volumes:
      - ./data:/data
    environment:
      - VITE_API_URL=http://localhost:8889
      - VITE_WS_URL=ws://localhost:8889
```

MCP example
```js
// Add a bookmark via MCP
await mcp.hubble_add_bookmark({
  title: 'Docs',
  url: 'https://hubble.yourdomain.com/docs',
  group: 'Development',
});
```

Nginx snippet
```nginx
location / { proxy_pass http://localhost:8888; }
location /api { proxy_pass http://localhost:8889; }
```

---

## Implementation Plan (4–5 days)

Day 1 — Scaffold & Brand
- Create Astro project, Tailwind, base layout, color tokens, header/footer.

Day 2 — Home + CTAs
- Hero, pillars, code tabs (Docker/MCP/API), screenshot carousel.

Day 3 — Features + Integrations
- Feature detail pages; integration cards; link to docs.

Day 4 — Docs + Deploy
- Import README/CHANGELOG; Deploy page (Compose, env, Nginx, security tips).

Day 5 — Polish & Ship
- SEO, OG images, analytics, a11y pass, performance budget, CI/CD.

---

## Definition of Done
- Clear path to “docker‑compose up” from Home in ≤ 2 clicks.
- Lighthouse: Performance ≥ 90, A11y ≥ 95, SEO ≥ 95 on Home and Docs.
- Working copy buttons; star count visible; mobile layout verified.
- Links to all core docs; no 404s; dark/light theme works.

---

## Risks & Mitigations
- Scope creep into app UI: keep marketing site separate repo/folder.
- Demo hosting/security: prefer video/screenshot carousel if no sandboxed demo.
- Asset quality: curate crisp, anonymized screenshots; generate OG images.

---

## Asset Checklist
- Logo SVG (exists in repo), favicon, app screenshots (card view, discovery, sharing), OG preview.
- Code snippets (Compose, MCP, Nginx), badges (Docker, MCP), release version.

---

## Notes for Developers
- Reuse existing brand tokens and screenshots from `docs/`.
- Source of truth for features: `README.md` and `CHANGELOG.md`.
- Keep marketing copy honest: self‑host, non‑commercial license (CC BY‑NC 4.0).

