# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
EME Estudio is a Next.js class reservation system for fitness/yoga studios with role-based authentication. The system supports three user roles: ADMIN, INSTRUCTOR, and STUDENT, with separate dashboards and functionality for each.

## Development Commands

### Database
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio for database management
- `npm run db:seed` - Seed the database with initial data

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Architecture

### Authentication & Authorization
- **NextAuth v5** with credentials provider using bcryptjs
- **Role-based routing** via middleware.ts:
  - `/admin/*` - Admin only
  - `/student/*` - Students and admins
  - `/instructor/*` - Instructors and admins
  - `/dashboard` - Redirects based on user role
- **Session management** with JWT strategy (30-day expiration)

### Database (Prisma + PostgreSQL)
- **Multi-role user system** with unified User model
- **Class management**: ClassType, Class, Location, Instructor
- **Booking system**: Reservation, Package (credits), Waitlist
- **Payment tracking** with multiple payment methods
- **Audit logging** for system changes

### Frontend (Next.js 15 + React 19)
- **App Router** with TypeScript
- **Tailwind CSS** with shadcn/ui components
- **Path aliases** configured in tsconfig.json (@/* maps to src/*)
- **Responsive design** with mobile-first approach

### Key Business Logic
- **Credit-based packages**: Students purchase packages with credits, each class reservation consumes credits
- **Frame size selection**: SMALL, MEDIUM, LARGE for reservations
- **Capacity management**: Classes have capacity limits with waitlist system
- **Package expiration**: Automatic tracking and notifications
- **Multiple payment methods**: Cash (pesos/USD), transfers, with comprehensive tracking

### API Structure
Organized by role with clear separation:
- `/api/admin/*` - Admin-only endpoints
- `/api/student/*` - Student-specific endpoints
- `/api/instructor/*` - Instructor functionality
- `/api/auth/*` - Authentication endpoints
- `/api/analytics/*` - Reporting and analytics

### Component Organization
- `src/components/ui/` - shadcn/ui base components
- `src/components/auth/` - Authentication-related components
- `src/components/dashboard/` - Dashboard-specific components
- `src/components/forms/` - Form components
- `src/components/layouts/` - Layout components

### State Management
- **Zustand** for client-side state management
- **TanStack Query** for server state and caching
- **Form handling** with controlled components

## Important Implementation Notes

### Email System
- Mock email service in development (logs to console)
- Production setup requires configuring SendGrid, AWS SES, or SMTP
- See EMAIL_SETUP.md for detailed configuration

### Environment Variables
Check .env.example for required variables:
- DATABASE_URL (PostgreSQL)
- NEXTAUTH_SECRET
- Email service credentials (production only)

### File Upload
- Next.js image optimization configured for AWS and Cloudinary
- 2MB body size limit for server actions

### Security
- Password hashing with bcryptjs
- CORS headers configured for API routes
- User status checking (ACTIVE/INACTIVE/SUSPENDED)
- Input validation with custom validation utilities

## Code Style
- TypeScript strict mode enabled
- ESLint with Next.js config
- Consistent naming: camelCase for variables, PascalCase for components
- Database fields use snake_case (mapped via Prisma)
- Form validation using custom utilities in src/lib/validations.ts

## Testing Strategy
- Type checking with `npm run type-check`
- Linting with `npm run lint`
- Database testing via Prisma Studio
- API testing through development endpoints