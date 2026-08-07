# Cloudflare WAF Rate Limiting Recommendation

This system lacks application-level rate limiting (e.g. for `/api/auth/telegram`). It relies entirely on Cloudflare's infrastructure.
To prevent abuse and exhaustion of D1/Workers free tier via automated retries, it is highly recommended to configure Cloudflare Web Application Firewall (WAF) Rate Limiting rules via the Cloudflare Dashboard.

**Recommended Setup:**
- Apply a Rate Limiting rule to URI Path starts with `/api/`
- Limit: e.g. 100 requests per 10 seconds per IP
- Action: Block or Managed Challenge
