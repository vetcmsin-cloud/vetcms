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
│   ├── app-sidebar.tsx   # Main navigation sidebar (role-based)
│   ├── theme-provider.tsx # Dark/light mode provider
│   └── theme-toggle.tsx  # Theme toggle button
├── pages/
│   ├── dashboard.tsx     # Dashboard with stats overview
│   ├── patients.tsx      # Pet patient management
│   ├── owners.tsx        # Pet owner management
│   ├── appointments.tsx  # Appointment scheduling
│   ├── records.tsx       # Medical records (doctor/admin only)
│   ├── login.tsx         # Login page
│   ├── user-management.tsx # User CRUD (admin only)
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
- **Three roles**: superadmin, doctor, receptionist
- **Session-based auth**: express-session with PostgreSQL session store (connect-pg-simple)
- **Default users** (seeded on first startup):
  - admin@petpointvet.in / admin123 (superadmin)
  - varsha@petpointvet.in / doctor123 (doctor)
  - rec@petpointvet.in / reception123 (receptionist)

### Role Permissions
| Feature | Superadmin | Doctor | Receptionist |
|---------|-----------|--------|-------------|
| Dashboard | Yes | Yes | Yes |
| Patients | Yes | Yes | Yes |
| Owners | Yes | Yes | Yes |
| Appointments | Yes | Yes | Yes |
| Medical Records | Yes | Yes | No (server-enforced) |
| User Management | Yes | No | No |

## Key Features
1. **Dashboard**: Overview stats (patients, owners, appointments), upcoming appointments, recent patients
2. **Patients**: Register, view, and search pets with species, breed, age, weight
3. **Owners**: Manage pet owners with contact information
4. **Appointments**: Schedule, filter by status, complete/cancel appointments
5. **Medical Records**: Add diagnoses, treatments, prescriptions with accordion-style view
6. **User Management**: Admin-only CRUD for staff accounts with role assignment
7. **Login**: Email/password authentication with demo credentials display

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

## Database
PostgreSQL with tables: users, owners, pets, appointments, medical_records
Database is seeded with sample data and default users on first startup.

## Running
`npm run dev` starts both frontend (Vite) and backend (Express) on port 5000.
