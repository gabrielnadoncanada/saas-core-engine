# Security Best Practices Report

## Executive Summary

Scope reviewed: `packages/auth-core`, `packages/db` (with targeted verification of `apps/web` integration points that enforce auth/session behavior).

I found **2 medium-risk issues** and **1 low-risk issue**. No critical vulnerabilities were identified in the reviewed scope.  
Primary risks are around **account enumeration** and **IP-based rate-limit bypass when proxy headers are trusted**.

---

## Medium Severity

### [AUTH-001] Account Enumeration via Signup Error Semantics
- Rule ID: `NEXT-AUTH-001` (auth behavior should avoid leaking account existence)
- Severity: Medium
- Location:
  - `packages/auth-core/src/flows/signup.flow.ts:26`
  - `apps/web/src/server/auth/auth-error-response.ts:18`
- Evidence:
  - `signup.flow.ts` throws `authErr("email_in_use", "Email already in use")` when the user exists.
  - `auth-error-response.ts` maps `email_in_use` to a distinct `409` response with `{ error: "email_in_use" }`.
- Impact:
  - Attackers can enumerate registered emails by submitting signup attempts and observing a distinct response.
- Fix:
  - Return a generic response for signup collisions (same status/body as a successful request path), and handle UX messaging out-of-band (e.g., email-based flow).
- Mitigation:
  - Keep aggressive per-IP and per-identifier rate limiting on signup endpoints.
- False positive notes:
  - If the product intentionally accepts account enumeration as a requirement, document this as an explicit tradeoff.

### [AUTH-002] Rate-Limit Key Can Be Spoofed When Proxy Headers Are Trusted
- Rule ID: `NEXT-AUTH-001` / abuse prevention hardening
- Severity: Medium
- Location:
  - `apps/web/src/server/http/request-ip.ts:4`
  - `apps/web/src/server/auth/auth-rate-limit.ts:21`
- Evidence:
  - `extractClientIp` returns `x-forwarded-for` first hop or `x-real-ip` directly when `TRUST_PROXY_HEADERS=true`.
  - `enforceAuthRateLimit` uses that derived IP directly in the limiter key.
- Impact:
  - If deployed where clients can inject proxy headers, attackers can rotate fake IPs and bypass auth throttling.
- Fix:
  - Trust proxy headers only behind known infrastructure; validate source network/hop chain and prefer platform-provided trusted client IP.
  - Reject malformed/non-IP values before building rate-limit keys.
- Mitigation:
  - Add identifier-based secondary limits (email hash / account / device fingerprint) in addition to IP.
- False positive notes:
  - If requests always pass through a trusted edge that sanitizes these headers, exploitation risk is reduced.

---

## Low Severity

### [AUTH-003] No Retention Cleanup for `auth_rate_limit_buckets`
- Rule ID: Operational hardening
- Severity: Low
- Location:
  - `packages/db/prisma/schema.prisma:305`
  - `apps/web/src/server/auth/auth-rate-limit.ts:24`
- Evidence:
  - Buckets are continuously upserted by `(key, windowStart)`; no scheduled cleanup path was found for old windows.
- Impact:
  - Long-term table growth can degrade performance/cost, and worsens if spoofed-IP traffic is allowed.
- Fix:
  - Add periodic cleanup (e.g., delete rows older than N hours/days) via cron/job.
- Mitigation:
  - Indexes are already present; keep them and monitor table size.
- False positive notes:
  - If cleanup is handled externally (DB TTL/partition maintenance), this may already be mitigated.

---

## Notable Strengths Observed
- Session tokens and email tokens are stored hashed (`packages/auth-core/src/sessions/session.service.ts:29`, `packages/auth-core/src/email-tokens/email-token.service.ts:34`).
- Token hashing enforces pepper presence/length (`packages/auth-core/src/hashing/token.ts:12`).
- Password hashing uses Argon2id with rehash support (`packages/auth-core/src/hashing/password.ts:6`, `packages/auth-core/src/hashing/password.ts:33`).
- OAuth redirect path validation exists in core (`packages/auth-core/src/oauth/state.service.ts:10`, `packages/auth-core/src/oauth/safe-redirect.ts:3`).
- Session cookie flags are explicitly set (`apps/web/src/server/adapters/cookies/session-cookie.adapter.ts:15`).

