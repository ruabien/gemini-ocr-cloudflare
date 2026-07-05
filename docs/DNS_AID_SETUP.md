# DNS-AID (DNS for AI Discovery) Setup Guide

To resolve the "DNS for AI Discovery (DNS-AID) well-known entrypoint records not found" issue, you need to publish ServiceMode `SVCB` or `HTTPS` records in your DNS management dashboard (e.g., Cloudflare) and enable DNSSEC. 

Since DNS records cannot be configured directly from this repository without Infrastructure-as-Code (like Terraform), please follow the steps below in your DNS provider's dashboard.

## 1. Add SVCB / HTTPS Records

Log into your DNS Management Dashboard (e.g., Cloudflare), select your domain (e.g., `doc.hotro.online` or `lexocr.com`), and navigate to the **DNS > Records** section. Add the following records:

### Record 1: Agent Index
* **Type:** `SVCB` (or `HTTPS`)
* **Name:** `_index._agents`
* **Target:** `doc.hotro.online` (or your domain name)
* **Priority:** `1`
* **TTL:** `Auto` (or `3600`)
* **SVCB Parameters:** 
  * `alpn="a2a"`
  * `port=443`
  * `mandatory=alpn,port`

### Record 2: Agent-to-Agent (A2A)
* **Type:** `SVCB` (or `HTTPS`)
* **Name:** `_a2a._agents`
* **Target:** `doc.hotro.online` (or your domain name)
* **Priority:** `1`
* **TTL:** `Auto` (or `3600`)
* **SVCB Parameters:** 
  * `alpn="a2a"`
  * `port=443`
  * `mandatory=alpn,port`

---

### BIND Zone File Equivalent
If your DNS provider supports importing zone files natively, you can copy and paste the following snippet:
```dns
_index._agents.doc.hotro.online. 3600 IN SVCB 1 doc.hotro.online. alpn="a2a" port=443 mandatory=alpn,port
_a2a._agents.doc.hotro.online. 3600 IN SVCB 1 doc.hotro.online. alpn="a2a" port=443 mandatory=alpn,port
```

## 2. Enable DNSSEC

For validating resolvers to return authenticated data (which is a requirement for the DNS-AID check), your discovery zone must be cryptographically signed.

If you are using **Cloudflare**:
1. Navigate to **DNS > Settings**.
2. Scroll down to the **DNSSEC** section.
3. Click **Enable DNSSEC**. Cloudflare will automatically manage the signing of your zone.

## 3. Validation

Once the records have propagated and DNSSEC is active, you can validate your setup using the `isitagentready` scanner:

```bash
curl -X POST https://isitagentready.com/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://doc.hotro.online"}'
```

Verify that `checks.discoverability.dnsAid.status` returns `"pass"`.