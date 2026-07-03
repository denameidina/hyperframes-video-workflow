# Security Policy

## Reporting

Please report security issues privately to the project owner instead of opening
a public issue.

## Secrets

Never commit:

- `.env`
- Repliz access or secret keys
- Cloudflare API tokens
- R2 credentials or signed URLs
- private raw footage or client media

The publish flow uses Wrangler auth and environment variables. It should not
require S3-style R2 access keys in this repository.
