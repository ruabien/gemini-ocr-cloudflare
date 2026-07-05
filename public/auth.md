# auth.md - LexOCR Agent Registration

Welcome to **LexOCR** – the AI‑powered OCR service for Vietnamese legal documents.

## How to Register an Agent

1. **Create an account** (or use an existing one) at https://lexocr.com.
2. **Generate an API client** from your dashboard.
3. **Register the agent** by sending a POST request to the registration endpoint:

```
POST https://lexocr.com/auth/register
Content-Type: application/json

{
  "client_id": "<YOUR_CLIENT_ID>",
  "client_secret": "<YOUR_CLIENT_SECRET>",
  "redirect_uris": ["https://your‑app.com/callback"],
  "grant_types": ["authorization_code"]
}
```

The response will contain the `client_id` and `client_secret` you must use for OAuth flows.

## Supported Identity Types

- `email` – Users authenticate with a verified email address.
- `phone_number` – (optional) Users may authenticate with SMS verification.

## Credential Types

- **OAuth 2.0 Authorization Code Grant** – Standard, secure flow for web and mobile apps.
- **PKCE** – Recommended for native applications.

## Claims & Revocation

- **Claims endpoint**: `https://lexocr.com/api/claims` – Retrieve user profile information after authentication.
- **Token revocation**: `https://lexocr.com/api/revoke` – Revoke refresh or access tokens.

## Quick Start

```bash
# Example using curl
curl -X POST https://lexocr.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
        "client_id": "my-client",
        "client_secret": "s3cr3t",
        "redirect_uris": ["https://myapp.com/callback"],
        "grant_types": ["authorization_code"]
      }'
```

After registration, integrate the returned credentials into your OAuth client library.

---

For detailed API documentation, see the OpenAPI spec at `https://lexocr.com/.well-known/openapi.json`.