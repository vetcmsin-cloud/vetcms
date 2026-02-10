# PetPoint Pro - Veterinary Clinic Management Software

## Overview
PetPoint Pro is a comprehensive veterinary clinic management application for managing patients (pets), pet owners, appointments, and medical records. Built with a modern stack featuring React frontend with Shadcn UI components and an Express.js backend with PostgreSQL database. Includes session-based authentication with role-based access control.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with express-session + connect-pg-simple (PostgreSQL session store)
- **Password Hashing**: bcryptjs
- **Routing**: Wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
```
client/src/
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── app-sidebar.tsx   # Main navigation sidebar (permission-based)
│   ├── patient-chart.tsx  # Patient chart panel (Sheet) with 5 tabs
│   ├── theme-provider.tsx # Dark/light mode provider
│   └── theme-toggle.tsx  # Theme toggle button
├── pages/
│   ├── dashboard.tsx     # Dashboard with stats overview
│   ├── patients.tsx      # Pet patient management + patient chart
│   ├── owners.tsx        # Pet owner management
│   ├── appointments.tsx  # Appointment scheduling
│   ├── records.tsx       # Medical records (doctor/admin only)
│   ├── login.tsx         # Login page
│   ├── user-management.tsx # User CRUD (admin only)
│   ├── admin-dashboard.tsx # Admin hub page
│   ├── admin-backup.tsx   # Data backup export
│   ├── admin-fees.tsx     # Fee structure management
│   ├── admin-billing.tsx  # Billing & invoices
│   ├── admin-roles.tsx    # Role management
│   ├── admin-user-rights.tsx # User permissions management
│   ├── admin-data.tsx     # Data management & erasure (superadmin only)
│   └── not-found.tsx     # 404 page
├── hooks/
│   ├── use-auth.ts       # Auth state management hook
│   └── use-toast.ts
├── lib/
│   ├── queryClient.ts    # React Query setup + apiRequest helper
│   └── utils.ts          # Utility functions
server/
├── index.ts              # Express server entry point
├── routes.ts             # API routes with auth middleware
├── auth.ts               # Auth setup, password utils, middleware (requireAuth, requireAdmin, requireRole)
├── storage.ts            # Database storage layer
├── db.ts                 # Database connection
├── seed.ts               # Seed data (includes default users)
shared/
├── schema.ts             # Drizzle ORM schemas + Zod validation (includes users table)
```

## Authentication & Roles
- **Four roles**: superadmin, doctor, receptionist, pharmacy
- **Session-based auth**: express-session with PostgreSQL session store (connect-pg-simple)
- **Default users** (seeded on first startup):
  - superadmin@petpointvet.in / Admin@9447770876# (superadmin - master admin with data.erase)
  - admin@petpointvet.in / admin123 (superadmin)
  - varsha@petpointvet.in / doctor123 (doctor)
  - rec@petpointvet.in / reception123 (receptionist)

### Role Permissions
| Feature | Superadmin | Doctor | Receptionist | Pharmacy |
|---------|-----------|--------|-------------|----------|
| Dashboard | Yes | Yes | Yes | Yes |
| Patients | Yes | Yes | Yes | View only |
| Owners | Yes | Yes | Yes | No |
| Appointments | Yes | Yes | Yes | No |
| Medical Records | Yes | Yes | No | No |
| Billing - View | Yes | Yes | Yes (print only) | Yes |
| Billing - Create | Yes | Yes | No | No |
| Billing - Edit | Yes | Yes | No | Yes (forwarded only) |
| User Management | Yes | No | No | No |

### Billing & Invoice System
- **Invoice number format**: #PET-XXXX (server-generated, sequential)
- **Invoice statuses**: pending, forwarded, paid, cancelled
- **createdBy**: Tracks which user created each invoice
- **Role-based billing access**:
  - Doctor: Can create invoices, add consultation fees, edit invoices, mark paid, forward to pharmacy
  - Pharmacy: Can only edit invoices with "forwarded" status (add medicine prices)
  - Receptionist: Read-only access, can only view and print invoices
  - Superadmin: Full access to all billing features

## Key Features
1. **Dashboard**: Overview stats (patients, owners, appointments), upcoming appointments, recent patients
2. **Patients**: Register, view, and search pets with species, breed, age, weight, color, microchip
3. **Patient Chart**: Slide-in panel with 5 tabs (Patient Info, Owner, History, Documents, Medical Records)
   - SOAP note form (Subjective, Objective, Assessment, Plan) in Medical Records tab
   - "Save Record" and "Save & Generate Invoice" buttons
   - "Save & Generate Invoice" creates a pending invoice with server-generated #PET-XXXX number
   - Book Appointment and Edit Patient actions from the chart
4. **Owners**: Manage pet owners with contact information
5. **Appointments**: Schedule, filter by status, complete/cancel appointments
6. **Medical Records**: Add diagnoses, treatments, prescriptions with accordion-style view
7. **User Management**: Admin-only CRUD for staff accounts with role assignment
8. **Login**: Email/password authentication with demo credentials display, dynamic background from clinic settings
9. **Clinic Settings** (Admin): Configure invoice printer type (Thermal 58mm/80mm, A5, A4), clinic info for bills (name, address, phone, email, GST, registration, footer, terms), and login screen background
10. **Invoice Design Tool** (Admin): Customize invoice header/accent/text colors, font style, clinic logo. Live preview in settings.
11. **UPI Payment QR Code**: Configurable UPI ID, bank name, payee name in admin settings. Auto-generated QR code on invoices with amount pre-filled. Currency in INR (\u20B9).

## API Endpoints
### Auth
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users (admin only)
- `GET/POST /api/users` - List/Create users
- `PATCH/DELETE /api/users/:id` - Update/Delete user

### Data (requires auth)
- `GET/POST /api/owners` - List/Create owners
- `GET/PATCH/DELETE /api/owners/:id` - Get/Update/Delete owner
- `GET/POST /api/pets` - List/Create pets
- `GET/PATCH/DELETE /api/pets/:id` - Get/Update/Delete pet
- `GET/POST /api/appointments` - List/Create appointments
- `GET/PATCH/DELETE /api/appointments/:id` - Get/Update/Delete appointment
- `GET/POST /api/medical-records` - List/Create medical records (doctor/admin only)
- `GET/DELETE /api/medical-records/:id` - Get/Delete medical record (doctor/admin only)

### Clinic Settings
- `GET /api/clinic-settings` - Get all settings (public, no auth needed for login bg)
- `PATCH /api/clinic-settings` - Update settings (admin only, key-value pairs)

## Database
PostgreSQL with tables: users, owners, pets, appointments, medical_records, clinic_settings
Database is seeded with sample data and default users on first startup.

## Running
`npm run dev` starts both frontend (Vite) and backend (Express) on port 5000.
