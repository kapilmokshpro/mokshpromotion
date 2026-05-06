# Moksh Promotion - Project Handover Document

Document Version: 1.0  
Prepared On: 06 May 2026  
Prepared For: Project Handover

## 1) Executive Summary

Moksh Promotion ek full-stack web platform hai jo outdoor advertising workflow ko end-to-end handle karta hai:
- Public website + inventory discovery
- Quote/cart/order intake
- Lead management for sales
- Payment tracking for finance
- Campaign execution tracking for operations
- Discount approval and inquiry workflows
- Role-based internal dashboard for multiple teams

Core intent: lead se campaign delivery aur payment closure tak single system.

## 2) Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- Styling: Tailwind CSS
- Auth: NextAuth (Credentials provider)
- Database ORM: Prisma
- Database: PostgreSQL (via `DATABASE_URL`)
- Email: Resend API (fallback simulation when key missing)
- Build/Runtime: Node.js

## 3) Repository Structure (High-Level)

- `app/` - Next.js routes (public, auth, dashboard, APIs)
- `components/` - reusable UI components
- `lib/` - auth, DB client, business helpers, validators, email helpers
- `prisma/` - schema + seed
- `scripts/` - operational scripts (example: payment reminder cron)
- `public/` - static assets

Route grouping pattern:
- `app/(site)` -> public pages
- `app/(auth)` -> auth pages
- `app/(dashboard)` -> internal role-based dashboard pages
- `app/api/*` -> backend APIs

## 4) Environment Variables

Base config from `.env.example`:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `SUPER_ADMIN_EMAIL`
- `ADMIN_EMAIL`
- `INFO_EMAIL`
- `RESEND_API_KEY`

Optional/feature-specific vars may exist in code for email and integrations.

## 5) Runbook (Local Setup)

1. Install dependencies: `npm install`
2. Configure env file from `.env.example`
3. Prisma generate/migrate flow:
1. `npx prisma generate`
2. `npx prisma db push` (or migration flow if used in environment)
4. Seed data (if required): `npx prisma db seed`
5. Start app: `npm run dev`

Common scripts:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:push`
- `npm run analyze`

## 6) Authentication and Authorization

- NextAuth credentials-based login configured in `lib/auth.ts`.
- Middleware protects dashboard and role-specific areas.
- Roles actively used:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `SALES`
  - `FINANCE`
  - `OPERATIONS`
  - `CLIENT`

Special behavior:
- Super admin impersonation flow implemented (switch user context and revert).

## 7) Core Business Modules

## 7.1 Lead Management

- Lead create/read/update flows
- Lead assignment and ownership tracking
- Lead logs/history (`LeadLog`)
- Pipeline state transitions
- Sales handoff to finance/operations
- Lead detail view integrates pricing, campaign items, payment snapshot, timeline

## 7.2 Inventory Management

- Hoarding/site inventory model (`InventoryHoarding`)
- Public listing by location filters (state/district/city)
- Internal inventory table for admin/ops
- Bulk import (CSV/XLSX) with validation and duplicate handling
- Archive/active toggles

## 7.3 Campaign Planning

- Lead-linked campaign items (`LeadCampaignItem`)
- Add/remove inventory into lead plan
- Base + final totals recalculation
- Plan save/share and proposal generation

## 7.4 Payments and Finance

- Lead payment records (`LeadPayment`)
- Transactions (`PaymentTransaction`)
- Followups (`PaymentFollowupNote`)
- Reminder logs (`PaymentReminderLog`)
- Pending queue views for finance
- Payment reminder cron script available in `scripts/payment-reminders-cron.ts`

## 7.5 Orders / Checkout

- Cart-based checkout flow
- Creates customer/project/invoice records
- Sends confirmation/summary emails
- Orders page reads customer history by authenticated email

## 7.6 Discount Workflows

Codebase me multiple discount flows co-exist:
- Lead discount request + token review + OTP approval/reject flow
- Discount inquiry flow from cart/users
- Legacy/deprecated discount endpoints also present

Operationally, handover ke time team ko clear karna hoga kaunsa flow canonical hai.

## 8) Database Domain Model (Important Tables)

- Access and users:
  - `User`
  - `VerificationToken`
- CRM/Sales:
  - `Lead`
  - `LeadLog`
  - `Plan`
  - `Reminder`
  - `OpsTask`
- Inventory:
  - `InventoryHoarding`
  - `LeadCampaignItem`
- Finance:
  - `LeadPayment`
  - `PaymentTransaction`
  - `PaymentFollowupNote`
  - `PaymentReminderLog`
- Client and billing:
  - `Customer`
  - `Project`
  - `Invoice`
- Discount system:
  - `DiscountRequest`
  - `DiscountCode`
  - `DiscountInquiry`
  - `AdminOtp`
- Governance:
  - `AuditLog`

Prisma schema is large and is the source of truth: `prisma/schema.prisma`.

## 9) Public Website Coverage

Public site generally includes:
- Home + service pages
- Petrol pump media pages (including city dynamic routes)
- Blog/case-study/about/contact/legal pages
- Inventory browsing and selection
- Cart and orders experience

## 10) Dashboard Coverage

Internal dashboard includes role-specific areas for:
- Super admin
- Admin
- Sales
- Finance
- Operations

Major internal capabilities:
- Lead table and lead details
- Campaign manager
- Payment manager and pending deals
- Ops kanban/task movement
- Inventory admin screens
- Discount request review surfaces

## 11) Email and Notification System

- Resend-powered transactional email helper in `lib/email.ts`
- HTML templates maintained in `lib/email-templates.ts`
- Selected site CSV attachment builder in `lib/site-selection-attachment.ts`
- Discount, proposal, order, and reminder email flows exist

If API key missing, some flows simulate success (important for staging/local behavior expectations).

## 12) API Surface (High-Level)

API routes are spread across:
- `app/api/leads/*`
- `app/api/inventory/*`
- `app/api/payment/*`
- `app/api/plans/*`
- `app/api/checkout/*`
- `app/api/discount*/*`
- `app/api/users/*`
- `app/api/projects/*`
- `app/api/customers/*`
- `app/api/admin/*`
- `app/api/super-admin/*`

Estimated route scale in current codebase:
- ~49 API route files
- ~48 page files
- ~51 component TSX files

## 13) Known Risks / Technical Debt

1. Discount logic fragmentation:
- Multiple parallel implementations and partially deprecated endpoints.
- Some helper functions in discount library are stubbed and can throw if hit.

2. Status naming inconsistency:
- Mixed usage like `UNDER_PRINTING` vs `PRINTING`, `UNDER_INSTALLATION` vs `INSTALLATION` in different layers.

3. Encoding artifacts:
- Some UI strings show mojibake-like currency text artifacts.

4. Role edge-cases:
- `CLIENT` role exists in signup flow but some role-gate assumptions are dashboard-first.

5. Documentation mismatch risk:
- Because flows evolved incrementally, endpoint behavior may differ across legacy/new paths unless standardized.

## 14) Handover Checklist (Recommended)

1. Confirm canonical discount flow and archive old routes.
2. Normalize status enums across DB/API/UI.
3. Fix encoding artifacts in UI literals.
4. Prepare role-permission matrix document (endpoint-level).
5. Validate all critical API flows with Postman/contract tests.
6. Add smoke test checklist for:
1. login
2. lead create/update
3. inventory import
4. discount approval
5. checkout/order
6. payment reminder cycle
7. Configure production env and rotate secrets before go-live handover.

## 15) Deployment Notes

- Ensure production DB connectivity and Prisma compatibility.
- Set all auth/email env vars before deployment.
- Run Prisma generate + schema sync/migrations in deployment pipeline.
- Validate NextAuth callback URLs and app URL consistency.
- Verify Resend domain/email sender configuration.

## 16) Suggested Immediate Post-Handover Improvements

1. Consolidate discount module into one service + one route family.
2. Add integration tests for lead lifecycle and finance flows.
3. Add audit coverage for all privileged admin actions.
4. Create runbook for cron-based payment reminders and failure handling.
5. Add API versioning or deprecation policy notes in code.

---

## Appendix A - Key Files for New Team

- `README.md`
- `package.json`
- `middleware.ts`
- `lib/auth.ts`
- `lib/db.ts`
- `lib/constants.ts`
- `lib/schemas.ts`
- `lib/email.ts`
- `lib/email-templates.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `scripts/payment-reminders-cron.ts`

## Appendix B - Ownership Suggestion

For smoother handover, assign owners by domain:
- Sales/CRM domain owner
- Finance/payments domain owner
- Operations/inventory domain owner
- Platform/auth/devops owner

This mapping reduces ambiguity in future bug-fixes and feature rollout.
