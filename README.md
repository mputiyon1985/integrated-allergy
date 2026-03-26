# Integrated Allergy IMS

> **Clinical immunotherapy compounding system for allergy practices — built to Meditab/AAAI/USP 797 standards.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Turso](https://img.shields.io/badge/Turso-libSQL-4FF8D2?logo=turso)](https://turso.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

**Integrated Allergy IMS** is a full-stack clinical information management system purpose-built for allergy and immunotherapy practices. It digitizes the complete immunotherapy workflow — from patient enrollment and allergen mix formulation through vial compounding, dosing schedule management, and appointment coordination.

The system follows established clinical standards including:
- **AAAI** (American Academy of Allergy, Asthma & Immunology) buildup and dilution protocols
- **USP 797** pharmaceutical compounding guidelines for sterile preparations
- Full audit trail compliance for regulatory and accreditation requirements

### Key Clinical Features

| Feature | Description |
|---|---|
| 🧑‍⚕️ **Patient Management** | Full enrollment, clinical history, and multi-tab detail views |
| 🌿 **Allergen Library** | 80+ allergens organized by type with safety validation |
| 🧪 **Vial Compounding** | 4-step wizard with auto-generated AAAI dilution series |
| 📅 **Scheduling** | Calendar with month/week/day views and appointment types |
| 👨‍⚕️ **Staff Management** | Physician and nursing staff rosters with NPI tracking |
| 📊 **Live Dashboard** | Real-time KPIs, activity feed, and vial expiry alerts |
| 🔒 **Audit Trail** | Immutable create/update/delete log with CSV export |

---

## Features

### 🧑‍⚕️ Patient Management

- **Full Enrollment Form** — capture demographics, diagnosis, referring physician, clinic location, insurance, and treatment start date
- **Auto-generated Patient IDs** — format `PA-001-XXXXX` for consistent identification
- **6-Tab Patient Detail View**:
  | Tab | Contents |
  |---|---|
  | Info | Demographics, clinical details, physician assignment |
  | Allergen Mix | Selected allergens with individual volume inputs |
  | Vials | Color-coded vial batch overview |
  | Dosing Schedule | Week-by-week buildup table with administration tracking |
  | Audit Log | Patient-scoped event history |
  | Appointments | Upcoming and past appointment list |

### 🌿 Allergen Library

- **80+ pre-loaded clinical allergens** organized by category: Mold, Pollen, Dust Mite, Animal Dander, Food, Insect
- **Multi-select mix builder** with per-allergen volume inputs (mL)
- **Safety validation engine** — real-time alerts for:
  - ⚠️ Proteolytic incompatibility (mold + pollen co-mixing)
  - ⚠️ Insect venom — requires separate vial protocol
  - 🔴 Glycerin concentration > 50% (USP 797 error)
  - ⚠️ Glycerin concentration > 40% (approaching limit)
- Lot number and expiry tracking per allergen

### 🧪 Vial Batch Compounding

- **4-Step Clinical Wizard**:
  1. Patient selection
  2. Allergen mix review and confirmation
  3. Dilution series generation
  4. Batch review and commit
- **Auto-generates the standard 4-vial AAAI dilution series**:
  | Vial | Dilution | Color | Potency |
  |---|---|---|---|
  | #1 | 1:10,000 | 🩶 Silver | Lowest |
  | #2 | 1:1,000  | 🔵 Blue   | Low |
  | #3 | 1:100    | 🟡 Yellow | Medium |
  | #4 | 1:10     | 🔴 Red    | Highest |
- 5 mL total volume per vial, 10% glycerin baseline, 90-day expiry
- Automatic buildup schedule generation (10 dose steps, 0.05 mL → 0.5 mL)

### 📅 Calendar & Scheduling

- **Multi-view calendar**: Month, Week, and Day views
- **Appointment types**:
  - 💉 Allergy Shots (immunotherapy injections)
  - 🧪 Skin Tests
  - 🩺 Evaluations
  - 📋 Follow-ups
  - 📌 Other
- Appointment statuses: `scheduled` → `confirmed` → `completed` / `cancelled` / `no_show`
- Filter by patient, date range, and appointment type
- Full patient context linked to each appointment

### 👨‍⚕️ Staff Management

**Physicians (Doctors)**
- Title (MD, DO, PA-C, NP), specialty, NPI number
- Clinic location assignment
- Linked to patient records via foreign key
- Active/inactive status management

**Nursing Staff (Nurses)**
- Credentials: RN, LPN, MA, CMA, NP
- NPI tracking for licensed staff
- Clinic location assignment
- Active/inactive status management

### 📊 Dashboard

Live KPI tiles with real-time database queries:

| KPI | Description |
|---|---|
| 👥 Total Patients | All enrolled patients |
| 💊 Active Treatments | Vials not yet expired |
| ⏰ Expiring Soon | Vials expiring within 30 days |
| 📅 Doses This Week | Shots administered in past 7 days |
| 💉 Shots Today | Shot appointments scheduled today |
| 🧪 Tests Today | Skin test appointments today |
| 📋 Evals Today | Evaluation appointments today |

Plus a **20-item live activity feed** from the system audit log.

### 🔒 Audit Trail

- Every `CREATE`, `UPDATE`, and `DELETE` action is logged automatically
- Fields captured: timestamp, action type, entity, entity ID, patient context, details
- System-wide audit log page with pagination (limit/offset)
- Patient-scoped audit log visible in the patient detail view
- CSV export support for compliance and accreditation reviews
- Filterable by patient ID, entity type

---

## Architecture

```
integrated-allergy/
├── app/
│   ├── api/                         # Next.js App Router API routes (server-side, Prisma + Turso)
│   │   ├── allergens/               # GET /allergens, POST /allergens
│   │   ├── appointments/            # GET/POST /appointments, PATCH/DELETE /appointments/[id]
│   │   ├── audit-log/               # GET /audit-log (paginated, filterable)
│   │   ├── dashboard/               # GET /dashboard (KPIs + activity feed)
│   │   ├── doctors/                 # GET/POST /doctors, PATCH/DELETE /doctors/[id]
│   │   ├── nurses/                  # GET/POST /nurses, PATCH/DELETE /nurses/[id]
│   │   ├── patients/                # GET/POST /patients
│   │   │   └── [id]/
│   │   │       ├── allergens/       # GET/POST patient allergen mix
│   │   │       ├── schedule/        # GET/POST dosing schedule
│   │   │       │   └── [doseId]/    # PATCH individual dose (mark administered)
│   │   │       └── vials/           # GET patient vials
│   │   └── vial-batches/            # POST generate vial batch + buildup schedule
│   ├── allergens/                   # Allergen library page
│   ├── audit-log/                   # System audit log page
│   ├── calendar/                    # Appointment calendar (client component)
│   ├── dashboard/                   # Dashboard page
│   ├── doctors/                     # Physician management page
│   ├── dosing/                      # Cross-patient dosing view
│   ├── nurses/                      # Nursing staff management page
│   ├── patients/                    # Patient list + enrollment
│   │   ├── [id]/                    # Patient detail (6 tabs)
│   │   └── new/                     # New patient form
│   └── vial-prep/                   # Vial compounding pages
│       └── new/                     # 4-step compounding wizard
├── components/
│   ├── clinical/
│   │   ├── DosingTable.tsx          # Week-by-week dose administration table
│   │   ├── SafetyAlert.tsx          # Incompatibility and limit warning banners
│   │   └── VialCard.tsx             # Color-coded vial display card
│   └── layout/
│       ├── Sidebar.tsx              # Navigation sidebar with clinical sections
│       └── TopBar.tsx               # Top header bar
├── lib/
│   ├── clinical/
│   │   ├── dilution.ts              # AAAI dilution engine: vial configs + buildup schedule
│   │   └── safety.ts                # USP 797 safety engine: incompatibility + glycerin rules
│   └── db.ts                        # Prisma client singleton (Turso/SQLite)
└── prisma/
    ├── schema.prisma                # Database schema (9 models)
    └── migrations/                  # Migration history
```

---

## Database Schema

| Model | Purpose | Key Fields |
|---|---|---|
| **Patient** | Core patient record | `name`, `dob`, `patientId`, `physician`, `clinicLocation`, `diagnosis`, `doctorId` |
| **Doctor** | Physician roster | `name`, `title`, `specialty`, `npi`, `clinicLocation`, `active` |
| **Nurse** | Nursing staff | `name`, `title` (RN/LPN/MA/CMA/NP), `npi`, `active` |
| **Allergen** | Allergen library | `name`, `type` (mold/pollen/dust/animal/food/insect), `manufacturer`, `lotNumber`, `stockConc`, `expiresAt` |
| **AllergenMix** | Patient-allergen mapping | `patientId`, `allergenId`, `volumeMl` |
| **Vial** | Compounded vials | `patientId`, `vialNumber` (1-4), `dilutionRatio`, `totalVolumeMl`, `glycerinPercent`, `colorCode`, `expiresAt` |
| **DosingSchedule** | Injection dose records | `patientId`, `vialId`, `weekNumber`, `doseMl`, `phase` (buildup/maintenance), `administered`, `administeredAt` |
| **Appointment** | Calendar events | `patientId`, `type`, `title`, `startTime`, `endTime`, `provider`, `status` |
| **AuditLog** | Immutable event log | `patientId`, `action`, `entity`, `entityId`, `details`, `createdAt` |

### Relationships

```
Patient ──< AllergenMix >── Allergen
Patient ──< Vial ──< DosingSchedule
Patient ──< Appointment
Patient ──< AuditLog
Doctor  ──< Patient
```

---

## Clinical Logic

### Dilution Engine (`lib/clinical/dilution.ts`)

Implements the AAAI standard 4-vial immunotherapy dilution series.

**Vial Configuration (`VIAL_CONFIGS`)**

Defines the four sequential vials from most dilute to most concentrated:
```
Silver → 1:10,000   (starting/most dilute)
Blue   → 1:1,000
Yellow → 1:100
Red    → 1:10       (maintenance/most concentrated)
```

**Buildup Schedule (`BUILDUP_SCHEDULE`)**

Ten-dose escalation protocol per AAAI buildup guidelines:
```
0.05 → 0.10 → 0.15 → 0.20 → 0.25 → 0.30 → 0.35 → 0.40 → 0.45 → 0.50 mL
```

Each dose step is administered weekly, with the patient advancing through Silver → Blue → Yellow → Red vials as tolerance is established.

**`generateVials(patientId)`** — Creates the 4-vial batch for a patient with 5 mL volume, 10% glycerin, and 90-day expiry.

**`generateBuildupSchedule(patientId, vialId, vialNumber, startWeek)`** — Returns 10 weekly dose records for a given vial.

### Safety Engine (`lib/clinical/safety.ts`)

Enforces compounding safety rules at the point of allergen mix formulation.

**`validateAllergenMix(allergenTypes[])`**

Checks for proteolytic incompatibility:
- **Mold + Pollen in same vial**: Mold allergens contain proteolytic enzymes that degrade pollen proteins over time, reducing potency. AAAI recommends separate vials.
- **Insect allergens**: Venoms and whole-body extracts require separate handling protocols.

**`validateGlycerin(percent)`**

Enforces USP 797 glycerin concentration limits:
- `> 50%` → **Error**: Exceeds safe limit; injection would be tissue-damaging
- `> 40%` → **Warning**: Approaching the safe limit

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** 9+
- A [Turso](https://turso.tech/) account for production, or local SQLite for development

### Installation

```bash
git clone https://github.com/mputiyon1985/integrated-allergy
cd integrated-allergy
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

### Database Setup

**Local development (SQLite):**
```bash
npx prisma migrate dev
```

**Production (Turso):**

Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in your environment or `.env`, then:
```bash
npx prisma migrate deploy
```

**Seed the allergen library (optional):**
```bash
# If a seed script exists
npx prisma db seed
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Default route** redirects to `/dashboard`. Navigate using the sidebar.

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npx vercel --prod
```

Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in your Vercel project environment variables.

---

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Turso database URL (production) or SQLite file path (dev) | `libsql://mydb.turso.io` |
| `DATABASE_AUTH_TOKEN` | ✅ (prod) | Turso authentication token; leave empty for local SQLite | `eyJh...` |
| `NODE_ENV` | — | Runtime environment | `development` / `production` |

**Local SQLite (development):**
```bash
DATABASE_URL=file:./prisma/dev.db
DATABASE_AUTH_TOKEN=
```

**Turso (production):**
```bash
DATABASE_URL=libsql://your-db-name.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
```

---

## API Reference

All endpoints are prefixed with `/api`. All responses are JSON.

### Patients

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/api/patients` | List all patients | — |
| `POST` | `/api/patients` | Enroll new patient | `{ name, dob, physician, clinicLocation?, diagnosis?, startDate?, doctorId? }` |
| `GET` | `/api/patients/[id]` | Get patient details | — |
| `PATCH` | `/api/patients/[id]` | Update patient record | Partial patient fields |
| `GET` | `/api/patients/[id]/allergens` | Get patient allergen mix | — |
| `POST` | `/api/patients/[id]/allergens` | Set patient allergen mix | `{ allergenId, volumeMl }[]` |
| `GET` | `/api/patients/[id]/vials` | Get patient vials | — |
| `GET` | `/api/patients/[id]/schedule` | Get dosing schedule | — |
| `POST` | `/api/patients/[id]/schedule` | Create dose records | `{ vialId, weekNumber, doseMl, phase }[]` |
| `PATCH` | `/api/patients/[id]/schedule/[doseId]` | Mark dose administered | `{ administered, administeredAt, reaction?, notes? }` |

### Clinical Resources

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/api/allergens` | List allergen library | — |
| `POST` | `/api/allergens` | Add allergen | `{ name, type, manufacturer?, lotNumber?, stockConcentration?, expiryDate? }` |
| `POST` | `/api/vial-batches` | Generate vial batch + buildup schedule | `{ patientId }` |

### Staff

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/api/doctors` | List physicians (`?active=true`) | — |
| `POST` | `/api/doctors` | Add physician | `{ name, title?, specialty?, email?, phone?, clinicLocation?, npi? }` |
| `PATCH` | `/api/doctors/[id]` | Update physician | Partial doctor fields |
| `DELETE` | `/api/doctors/[id]` | Deactivate physician | — |
| `GET` | `/api/nurses` | List nursing staff (`?active=true`) | — |
| `POST` | `/api/nurses` | Add nurse | `{ name, title?, email?, phone?, clinicLocation?, npi? }` |
| `PATCH` | `/api/nurses/[id]` | Update nurse record | Partial nurse fields |
| `DELETE` | `/api/nurses/[id]` | Deactivate nurse | — |

### Scheduling

| Method | Endpoint | Description | Query Params |
|---|---|---|---|
| `GET` | `/api/appointments` | List appointments | `patientId`, `from`, `to`, `type` |
| `POST` | `/api/appointments` | Create appointment | `{ patientId, type, title, startTime, endTime, provider?, notes?, status? }` |
| `PATCH` | `/api/appointments/[id]` | Update appointment | Partial appointment fields |
| `DELETE` | `/api/appointments/[id]` | Cancel/delete appointment | — |

### System

| Method | Endpoint | Description | Query Params |
|---|---|---|---|
| `GET` | `/api/dashboard` | KPIs + activity feed | — |
| `GET` | `/api/audit-log` | System audit log | `patientId`, `entity`, `limit`, `offset` |
| `GET` | `/api/audit` | Alias for audit-log | — |

---

## Contributing

Contributions are welcome. This is a clinical system — please keep patient safety top of mind.

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Follow clinical standards**: Any changes to dosing logic, safety rules, or vial formulas must cite the relevant AAAI or USP 797 guideline
4. **Keep the build passing**: `npm run build` must succeed
5. **Commit clearly**: Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
6. **Open a Pull Request** with a clear description of the clinical or technical change

### Clinical Review Note

Changes to `lib/clinical/dilution.ts` or `lib/clinical/safety.ts` should be reviewed by a clinical subject matter expert before merging. These files directly affect patient compounding protocols.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

> **Disclaimer:** This software is intended as a clinical workflow tool. It does not replace professional medical judgment. All immunotherapy protocols should be reviewed and approved by a licensed allergist-immunologist. Compounding must comply with applicable state pharmacy board regulations and USP 797 standards.
