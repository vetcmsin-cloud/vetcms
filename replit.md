# PetPoint Pro - Veterinary Clinic Management Software

## Overview
PetPoint Pro is a comprehensive veterinary clinic management application for managing patients (pets), pet owners, appointments, and medical records. Built with a modern stack featuring React frontend with Shadcn UI components and an Express.js backend with PostgreSQL database.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (client-side), Express (server-side)
- **State Management**: TanStack React Query

## Project Structure
```
client/src/
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── app-sidebar.tsx   # Main navigation sidebar
│   ├── theme-provider.tsx # Dark/light mode provider
│   └── theme-toggle.tsx  # Theme toggle button
├── pages/
│   ├── dashboard.tsx     # Dashboard with stats overview
│   ├── patients.tsx      # Pet patient management
│   ├── owners.tsx        # Pet owner management
│   ├── appointments.tsx  # Appointment scheduling
│   ├── records.tsx       # Medical records
│   └── not-found.tsx     # 404 page
├── hooks/
├── lib/
│   ├── queryClient.ts    # React Query setup + apiRequest helper
│   └── utils.ts          # Utility functions
server/
├── index.ts              # Express server entry point
├── routes.ts             # API routes
├── storage.ts            # Database storage layer
├── db.ts                 # Database connection
├── seed.ts               # Seed data
shared/
├── schema.ts             # Drizzle ORM schemas + Zod validation
```

## Key Features
1. **Dashboard**: Overview stats (patients, owners, appointments), upcoming appointments, recent patients
2. **Patients**: Register, view, and search pets with species, breed, age, weight
3. **Owners**: Manage pet owners with contact information
4. **Appointments**: Schedule, filter by status, complete/cancel appointments
5. **Medical Records**: Add diagnoses, treatments, prescriptions with accordion-style view

## API Endpoints
- `GET/POST /api/owners` - List/Create owners
- `GET/PATCH/DELETE /api/owners/:id` - Get/Update/Delete owner
- `GET/POST /api/pets` - List/Create pets
- `GET/PATCH/DELETE /api/pets/:id` - Get/Update/Delete pet
- `GET/POST /api/appointments` - List/Create appointments
- `GET/PATCH/DELETE /api/appointments/:id` - Get/Update/Delete appointment
- `GET/POST /api/medical-records` - List/Create medical records
- `GET/DELETE /api/medical-records/:id` - Get/Delete medical record

## Database
PostgreSQL with tables: owners, pets, appointments, medical_records
Database is seeded with sample data on first startup.

## Running
`npm run dev` starts both frontend (Vite) and backend (Express) on port 5000.
