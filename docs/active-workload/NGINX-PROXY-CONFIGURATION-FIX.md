# Nginx Proxy Configuration Fix for CSRF Headers

## Issue
When Hubble is deployed behind an nginx reverse proxy, the `X-Requested-With` header used for CSRF protection is not being forwarded from the client to the backend application, causing authentication requests to fail with a CSRF error.

## Root Cause
By default, nginx does not forward all headers from the client to the upstream server. Custom headers like `X-Requested-With` need to be explicitly configured to be passed through.

## Solution

### Option 1: Update Nginx Configuration (Recommended)
Add the following line to each API location block in your nginx configuration:

```nginx
# In your nginx site configuration file
location /api/ {
    # ... existing configuration ...

    # Add this line to forward the X-Requested-With header
    proxy_set_header X-Requested-With $http_x_requested_with;

    # ... rest of configuration ...
}

location /api/auth/ {
    # ... existing configuration ...

    # Add this line to forward the X-Requested-With header
    proxy_set_header X-Requested-With $http_x_requested_with;

    # ... rest of configuration ...
}
```

After making these changes:
1. Test the configuration: `sudo nginx -t`
2. Reload nginx: `sudo systemctl reload nginx`

### Option 2: Use the Updated CSRF Protection (Already Implemented)
The application now includes a multi-layered CSRF protection strategy that works even when the `X-Requested-With` header is stripped:

1. **Primary**: Checks for `X-Requested-With: XMLHttpRequest` header
2. **Fallback 1**: Validates Origin/Referer headers against allowed origins
3. **Fallback 2**: Ensures requests have `Content-Type: application/json`

This ensures the application remains secure even with misconfigured proxies.

## Testing
To verify the fix is working:

```bash
# Test directly against the backend (should work)
curl -X POST http://localhost:8889/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"password":"your-password","remember":false}'

# Test through nginx (should work after fix)
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"password":"your-password","remember":false}'
```

## Security Considerations
- The multi-layered approach maintains security while improving compatibility
- Origin/Referer validation prevents cross-site request forgery
- Content-Type checking prevents simple form-based attacks
- The `X-Requested-With` header remains the strongest protection when available

## Affected Deployments
This issue affects any Hubble deployment where:
- The application is behind a reverse proxy (nginx, Apache, HAProxy, etc.)
- The proxy hasn't been configured to forward the `X-Requested-With` header
- This is particularly common in production deployments

## Prevention
For future deployments, include the nginx configuration template with proper header forwarding in the deployment documentation.