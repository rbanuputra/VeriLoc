# GeoFace Attendance System — Project Context

> Dokumen konteks utama. Baca ini dulu sebelum kerja di repo ini.

## Role (asisten)
Senior Full-Stack Engineer & Cloud Architect — spesialisasi microservices, Kubernetes, dan AI integration.

## Ringkasan Project
Sistem absensi berbasis **geofencing** + **pengenalan wajah (Face Recognition)** untuk lingkungan perusahaan/organisasi.

## Tech Stack & Arsitektur
- **Architecture:** Monorepo. Modular Monolith untuk Core Service, Microservice terpisah untuk AI.
- **Orchestration:** Kubernetes (K8s) + Helm sebagai package manager.
- **Backend (Core):** NestJS (TypeScript) — Auth, Attendance, Geofencing.
- **AI Service:** FastAPI (Python) — DeepFace untuk Face Recognition & Liveness Detection.
- **Database:** PostgreSQL + PostGIS (perhitungan koordinat radius).
- **Storage:** MinIO (S3 compatible) untuk data gambar biometrik.
- **Gateway:** API Gateway (NestJS) — routing & JWT validation.

## Key Features (MVP)
1. **RBAC:** Admin, HRD, Staff.
2. **Geofencing:** Validasi radius lokasi pakai PostGIS `ST_DistanceSphere`.
3. **AI Attendance:** Validasi wajah (Liveness detection + Face match) sebelum absensi tercatat.
4. **Data Persistence:** Log absensi di Postgres, foto bukti di MinIO.

## Guidelines & Constraints
1. **Clean Code:** Clean Architecture, SOLID, modulasi ketat.
2. **Production-Ready:** TIDAK PERNAH hardcoded credential. Selalu environment variables (ConfigMaps di K8s).
3. **Modularity:** Ini monorepo — saat menjawab soal kode, selalu tunjukkan di folder mana file harus diletakkan.
4. **Concise:** Penjelasan teknis to-the-point, fokus implementasi & arsitektur scalable.

## Struktur Repo
- `services/api-gateway` — NestJS gateway (port 3000)
- `services/core-service` — NestJS + TypeORM (port 3001): auth, RBAC, user/role, attendance, geofencing
- `services/ai-service` — FastAPI + DeepFace (host 5001 → container 5000)
- `libs/shared-types` — shared types (masih kosong)
- `k8s/` — Helm charts + values
- `postman/` — koleksi & environment
- `docker-compose.yml` — orkestrasi lokal

## Arsitektur Multi-Tenant (SaaS)
Aplikasi ini **SaaS multi-tenant**: satu instance dipakai banyak perusahaan (tenant). Model isolasi: **shared DB + kolom `organization_id`** di semua tabel tenant. Semua query WAJIB di-scope `organization_id` (diambil dari JWT, bukan body).
- **Organization** = tenant (perusahaan pelanggan). Entity root.
- **Onboarding**: self-service signup `POST /auth/register-organization` → bikin Organization + user Admin pertama (atomik/transaksi).
- **Roles global + SuperAdmin**: `SuperAdmin` (platform, `organization_id=null`, kelola tenant) di atas `Admin`/`HRD`/`Staff` (dalam tenant). Role management = SuperAdmin only.
  - **Provisioning SuperAdmin** (tim developer): `GET`/`POST /organizations/platform/super-admins` (SuperAdmin only) → `UserService.createSuperAdmin` (org_id null). Seeder juga bikin 1 SuperAdmin: `admin@geoface.com` / `Password123!`.
  - **Anti privilege-escalation**: `UserService.create` menolak `role_id` = SuperAdmin (Admin tenant tidak bisa naik jadi SuperAdmin lintas tenant).
- **JWT payload**: `{ sub, email, role, organization_id }`. `@CurrentUser()` → `AuthUser { id, email, role, organizationId }` ([auth/interfaces/auth-user.interface.ts](services/core-service/src/auth/interfaces/auth-user.interface.ts)).
- Email user **unik global** (login by email tetap simpel).

## Status Saat Ini
- ✅ Auth multi-tenant (JWT+org, JwtAuthGuard, RolesGuard, @Roles, @CurrentUser), `POST /auth/register-organization` (signup tenant), `POST /auth/login`
- ✅ **Organization module** — entity tenant + `/organizations` (SuperAdmin only). Signup lewat auth.
- ✅ User & Role (RBAC) — user scoped per tenant; roles global (seeder: SuperAdmin/Admin/HRD/Staff + 1 SuperAdmin platform)
- ✅ AI service: `/health`, `/embed`, `/verify` (DeepFace lazy, Facenet)
- ✅ **Biometric module** — enroll & match wajah, **scoped org**:
  - `storage/` (MinIO), `ai/` (embed client), `biometric/` (enroll + match)
  - Embedding di Postgres `vector(128)` (pgvector) + `organization_id`; foto MinIO (`enrollments/{orgId}/{userId}/...`)
  - Match cosine pgvector (`<=>`) filter `user_id + organization_id`, threshold `FACE_MATCH_THRESHOLD` (0.40)
  - Konsumsi: `BiometricService.match(orgId, userId, file)`
  - Postgres image custom: `services/postgres/dockerfile` (PostGIS + pgvector) + init SQL
- ✅ **Office module** (dulu "Company") — kantor/cabang milik tenant (`latitude`, `longitude`, `radius_meters` default 150). `OfficeService.findNearest(orgId, lat, lng)` PostGIS `ST_DistanceSphere` scoped tenant. `/office` (CRUD; write = Admin/HRD).
- ✅ **Attendance module** — flow absensi (scoped tenant): `POST /attendance/check-in`|`/check-out` (multipart `file`+`latitude`+`longitude`) → (1) geofence office terdekat tenant dalam radius, (2) face match, (3) simpan foto MinIO + log `attendances`. History `/attendance/me`, `/attendance` (Admin/HRD). Entity relasi User & Office, `organization_id`, `distance_meters`, `face_distance`.
- ✅ **Fondasi reusable** (`common/`): `BaseTenantEntity` (id/organization_id/timestamps), `BaseTenantService<T>` (CRUD auto-scoped tenant + pagination), `PaginationQueryDto` + `paginate()`, decorator `@TenantId()`. **Pola wajib buat semua modul tenant baru** (extends base biar rapih & DRY).
- ✅ **P0 Liveness / anti-spoofing** — ai-service `POST /liveness` (DeepFace `extract_faces(anti_spoofing=True)` → `{is_real, antispoof_score}`). Core: `AiService.checkLiveness` → `BiometricService.checkLiveness`. Attendance cek liveness sebelum face match; simpan `liveness_score`. Toggle env `LIVENESS_ENABLED` (default true).
- ✅ **P0 Anti fake-GPS** — `CheckInDto.is_mock_location` (flag dari klien); attendance nolak kalau true.
- ✅ **P1 Leave module** (`leave/`) — cuti/izin/sakit/lembur + approval flow. `LeaveService extends BaseTenantService` (contoh reuse fondasi). Endpoint: `POST /leaves`, `GET /leaves/me`, `GET /leaves?status=` (Admin/HRD), `PATCH /leaves/:id/approve|reject`. Entity `LeaveRequest extends BaseTenantEntity`.
- ✅ **Hardening pass (production-readiness)** — semua #1–#11 kelar:
  - **#1 Migration**: `src/database/data-source.ts` + scripts `migration:generate|run|revert`; `synchronize` env-gated (`DB_SYNCHRONIZE`, default false; dev pakai true via compose). Prod: `npm run build && npm run migration:generate -- src/migrations/Init && npm run migration:run`.
  - **#2 Refresh token**: opaque token (hash sha256 di tabel `refresh_tokens`, rotasi). `TokenService`. Endpoint `POST /auth/refresh`, `POST /auth/logout`. Access token TTL 900s.
  - **#3 Reset password**: `POST /auth/forgot-password` + `/auth/reset-password` (tabel `password_reset_tokens`). `MailService` (dev: log link; prod: colok nodemailer/SES).
  - **#4 Rate limit**: `@nestjs/throttler` global (100/menit), login 5/menit, forgot-password 3/menit.
  - **#5 Global exception filter** (`common/filters/all-exceptions.filter.ts`) → error shape seragam `{success,statusCode,message,error,path,timestamp}`.
  - **#6 Swagger** di `/docs`.
  - **#7 Reuse**: Office pakai `BaseTenantService`; User/Attendance/Leave list ber-pagination.
  - **#8 Env validation** Joi (`common/config/env.validation.ts`) fail-fast.
  - **#9 Helmet + CORS** di main.ts.
  - **#10 Health** terminus (`/health` cek DB + ai-service).
  - **#11 Test**: `base-tenant.service.spec`, `leave.service.spec` (7 passed). Stub bawaan dihapus.
- ✅ **Payroll module** (`payroll/`) — kontrak karyawan + hitung gaji bulanan:
  - Entity: `EmployeeContract` (base_salary, T&C, tipe, PTKP, flag BPJS, param hitung; extends BaseTenantEntity), `ContractComponent` (EARNING/DEDUCTION, FIXED/PERCENT, taxable), `PayrollRecord` (slip gaji snapshot, unik per user+period, breakdown JSONB).
  - Hitung otomatis dari **absensi + lembur** (present/absent/overtime days dari tabel attendances & leave), besaran/tarif di-set HRD di kontrak.
  - **BPJS & PPh21 otomatis** (rumus Indonesia) — `TaxService` & `BpjsService`. **PPh21 metode TER** (PP 58/2023): masa Jan–Nov pakai tabel TER bulanan (`payroll/config/id-ter.config.ts`, Kategori A/B/C dari PTKP), masa **Desember rekalkulasi tahunan Pasal 17 − TER Jan–Nov**. Parameter TERPUSAT (⚠️ baseline, wajib validasi akuntan + update tahunan).
  - **Lembur per-JAM**: `LeaveRequest.hours` (wajib saat type=LEMBUR) × `contract.overtime_rate_per_hour`. Payroll jumlahkan jam lembur approved dalam periode.
  - Endpoint: `POST /contracts` (HRD), `GET /contracts` `/contracts/me` `/contracts/user/:id` `/contracts/:id`; `POST /payroll/run` (idempotent per period), `GET /payroll?period=YYYY-MM`, `GET /payroll/me`.
  - Test: `payroll-calculator.service.spec` (4 passed).
- ✅ **Onboarding berbasis dokumen** (`onboarding/`) — HRD upload kontrak → OCR → parse draft → review → confirm → buat akun + kontrak:
  - ai-service `POST /ocr` (PyMuPDF ekstrak teks PDF digital, fallback Tesseract `ind+eng` utk scan/gambar). `AiService.ocr()`.
  - `ContractParserService` (regex istilah gaji ID: gaji pokok, tunjangan, potongan, lembur/jam) → draft `{base_salary, overtime_rate_per_hour, components[], terms, notes[]}`. **Selalu di-review HRD (OCR tak 100% akurat).**
  - Entity `ContractDocument` (file MinIO + raw_text + extracted_data JSONB + status SCANNED→CONFIRMED + link user/contract).
  - Endpoint: `POST /onboarding/contracts/upload` (multipart file+fullname+email+role_id), `GET /onboarding/contracts[/:id]`, `POST /onboarding/contracts/:id/confirm`.
  - Confirm → `UserService.createEmployee` (password SEMENTARA, `must_change_password=true`, temp_password di-return sekali) + `ContractService.create`.
  - Auth: `POST /auth/change-password` (ganti password sendiri, cabut semua refresh token). Kolom `users.must_change_password`.
- ⬜ Sisa roadmap monetisasi (belum): **Billing/subscription + payment gateway (Xendit/Midtrans)**, Shift/jadwal, Reports/dashboard analytics, Web admin + Mobile/PWA, Notifikasi (WA/email/push), compliance UU PDP, assign user→office spesifik, kirim email sungguhan (nodemailer), enforce must_change_password (guard blokir endpoint sampai ganti).
