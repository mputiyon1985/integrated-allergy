# Business Rules — Integrated Allergy IMS

This file documents all enforced business rules and their context.
Update this file whenever a new rule is added or changed.

---

## Data Integrity Rules

### Locations
- **Entity is mandatory** — Every `ClinicLocation` must belong to a `BusinessEntity`. You cannot create a location without assigning it to an entity. Enforced at: `POST /api/locations` (returns 400 if `entityId` missing).

### Deletions
- **No hard deletes** — Nothing is ever permanently deleted in this system. All deletions set `deletedAt` timestamp only. Data is always recoverable. Enforced across all 8 tables: Patient, Doctor, Nurse, Allergen, Vial, DosingSchedule, Appointment, ClinicLocation, AppUser, BusinessEntity.

### Allergens
- **Proteolytic incompatibility** — Mold and pollen allergens should not be mixed in the same vial. The safety engine warns (but does not block) when both types are selected. See `lib/clinical/safety.ts`.
- **Glycerin limit** — Glycerin concentration must not exceed 50% per USP 797. The safety engine returns an error warning above 40% and a hard warning above 50%. See `lib/clinical/safety.ts`.

---

## Access Control Rules

### Multi-Tenant Isolation
- **Entity isolation** — Users can only see data belonging to their assigned entity. No cross-entity data visibility.
- **Location isolation** — Location staff can only see data for their assigned location(s).
- **Super admin exception** — IA employees with `super_admin` role can see all entities and all locations.

### User Management
- **Only IA (super_admin) can create users** — Entity admins and location staff cannot create or manage user accounts.
- **MFA is mandatory** — All users must complete TOTP MFA setup on first login before accessing the app.

---

## Clinical Protocol Rules

### Vial Batches
- **Standard 4-vial dilution series** — Following AAAI/USP 797 standards:
  - Vial 1 (Silver): 1:10,000 dilution
  - Vial 2 (Blue): 1:1,000 dilution
  - Vial 3 (Yellow): 1:100 dilution
  - Vial 4 (Red): 1:10 dilution
- **Default vial expiry** — 90 days from preparation date (configurable in Settings → Clinic Defaults).

### Dosing Schedule
- **Build-up phase** — Standard BUILDUP_SCHEDULE doses: 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5 mL per vial set.
- **Reaction tracking** — Any reaction must be documented before marking a dose as administered.

---

## Audit Trail Rules

- **All mutations are logged** — Every create, update, soft-delete action writes to the `AuditLog` table.
- **Audit logs are never deleted** — The `AuditLog` table has no `deletedAt` column and is never soft-deleted.

---

## Settings Rules

- **Clinic Locations require Entity** — Locations must be linked to a BusinessEntity (enforced).
- **Diagnosis and Location options are DB-driven** — No hardcoded lists; all configurable from Settings.
- **Doctor/Nurse titles are DB-driven** — All configurable from Settings → Doctor Titles / Nurse Titles.

---

---

## Identity Cross-Reference

- Every AppUser CAN be linked to a Doctor or Nurse profile (doctorId/nurseId)
- This link is bidirectional: Doctor.appUserId ↔ AppUser.doctorId
- When Rob the doctor logs in, the system knows he IS Dr. Rob Sikora, MD
- Clinical actions (scheduling, dosing, vial prep) can auto-populate the provider field
- Audit logs show clinical identity ("Dr. Rob Sikora" not just "user_abc123")
- The Sidebar footer displays the logged-in user's clinical identity (doctorName or nurseTitle) when linked

---

_Last updated: 2026-03-26_
_Maintainer: Pepper (AI) + Mark Putiyon_
