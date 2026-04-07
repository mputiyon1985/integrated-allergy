# HIPAA Compliance Documentation

## Overview

Integrated Allergy IMS handles Protected Health Information (PHI) and is subject to HIPAA Security Rule (45 CFR Part 164) requirements. This document outlines what PHI is stored, the security controls currently in place, required Business Associate Agreements (BAAs), remaining steps before production deployment, and the security contact.

---

## PHI Stored

The following categories of Protected Health Information (PHI) are stored in the database:

| Data Element | Location | Notes |
|---|---|---|
| Patient full name | `Patient.name` | Required for clinical records |
| Date of birth | `Patient.dob` | Used for patient identification |
| Phone number | `Patient.phone` | Optional; used for appointment contact |
| Email address | `Patient.email` | Optional; used for communication |
| Insurance ID | `Patient.insuranceId` | Optional; used for billing |
| Medical diagnosis | `Patient.diagnosis` | Allergy diagnosis codes |
| Treatment history | `DosingSchedule`, `Vial` | Immunotherapy dosing records |
| Physician assignment | `Patient.physician` | Treating clinician |
| Clinic location | `Patient.clinicLocation` | Treatment facility |
| Audit activity logs | `AuditLog` | Who accessed/modified records, and when |

---

## Security Controls in Place

### Authentication & Access Control
- **Password hashing:** bcrypt with cost factor 12
- **Multi-factor authentication (MFA):** TOTP-based; globally enforced by default
- **Session management:** Signed JWT cookies with short-lived temp tokens for MFA flows
- **Role-based access control (RBAC):** Roles: `super_admin`, `entity_admin`, `nurse`, `doctor`

### Rate Limiting
- **Persistent rate limiting:** Login attempts are tracked in the database (`AuditLog`) with a 5-attempt / 15-minute window
- **HIPAA-compliant:** Rate limit state survives serverless cold starts (no in-memory counters)
- **Enumeration protection:** Same error message for unknown email vs. wrong password

### Audit Logging
- **All PHI access logged:** Patient creation, vial generation, dosing schedules, and all PHI exports create `AuditLog` entries
- **Export audit trail:** Every CSV/JSON export (patients, backup, audit log) is logged with the requesting user ID
- **Login failures logged:** Failed login attempts are recorded with identifier for rate-limit enforcement and forensic review

### Security Headers
All API routes returning PHI include:
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Referrer-Policy: no-referrer` — prevents PHI leakage via Referer header
- `Cache-Control: no-store, no-cache, must-revalidate` — prevents PHI caching
- `Pragma: no-cache` — legacy cache control for older proxies

### Data Storage
- **Database:** Prisma ORM with soft-delete (`deletedAt`) on all PHI records — data is never hard-deleted
- **Encryption in transit:** HTTPS enforced in production (TLS 1.2+)
- **Local dev:** SQLite (`dev.db`) — **never commit to version control**

---

## Required Business Associate Agreements (BAAs)

Before going live with real patient PHI, the following BAAs must be executed:

| Vendor | Purpose | BAA Required |
|---|---|---|
| **Vercel Enterprise** | Application hosting and serverless runtime | ✅ Required — Standard Vercel does not sign BAAs; must upgrade to Vercel Enterprise HIPAA plan |
| **Turso / libSQL** | Auth database (users, sessions) | ✅ Required — Confirm Turso's BAA offering or migrate to a HIPAA-eligible alternative (e.g., PlanetScale HIPAA, Neon HIPAA tier) |
| **Neon / PostgreSQL** (if used) | Primary PHI database | ✅ Required — Neon offers a HIPAA Business Associate Agreement on Business/Enterprise tiers |
| **Any email provider** (future) | Patient communication | ✅ Required if sending PHI via email (e.g., SendGrid, Postmark HIPAA tier) |

> ⚠️ **Do not use free/standard tiers of any cloud provider with real PHI until BAAs are signed.**

---

## Remaining Steps Before Production with Real PHI

### High Priority (Blockers)
- [ ] **Sign BAAs** with Vercel Enterprise, Turso/Neon, and any other data processors
- [ ] **Enable MFA globally** — confirm `mfa_required` setting is `true` in production settings table
- [ ] **Implement authentication middleware** — all `/api/patients`, `/api/export`, and `/api/vials` routes currently lack server-side session validation; add `requireAuth()` middleware to verify the `ia_session` cookie on every request
- [ ] **Restrict export endpoints** — `/api/export/backup` must require `super_admin` role; other exports require at least `entity_admin`
- [ ] **Environment secrets audit** — rotate all JWT secrets, database URLs, and API keys before go-live; ensure they are stored in environment variables only (never in code)

### Medium Priority
- [ ] **Encryption at rest** — enable database-level encryption on the production database (Neon/Turso)
- [ ] **Automatic session expiry** — enforce short session timeouts (e.g., 8 hours) with idle timeout for clinical workstations
- [ ] **Password policy enforcement** — the `isStrongPassword` export exists but should be enforced server-side on the registration/password-change endpoint
- [ ] **Add `x-user-id` header population** — the export audit log reads `x-user-id` from request headers; ensure the frontend or auth middleware injects this on authenticated requests
- [ ] **Penetration testing** — conduct a third-party security assessment before launch
- [ ] **Workforce training** — document HIPAA training requirements for all staff with system access

### Low Priority (Post-Launch)
- [ ] **Automatic log retention policy** — implement `AuditLog` pruning to retain records for 6 years per HIPAA retention requirements
- [ ] **Incident response plan** — document procedures for breach notification (HIPAA requires notification within 60 days)
- [ ] **Disaster recovery testing** — test the `/api/export/backup` restore process

---

## Contact for Security Issues

For security vulnerabilities, suspected breaches, or HIPAA compliance questions:

- **Security contact:** [security@your-organization.com] *(update before launch)*
- **Privacy Officer:** [privacy@your-organization.com] *(update before launch)*
- **Emergency:** Follow your organization's incident response plan

> In the event of a suspected PHI breach, HIPAA requires notification to affected individuals within 60 days and to HHS within 60 days (or annually if fewer than 500 individuals are affected per state).

---

*Last updated: 2026-04-07*
