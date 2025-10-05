# EME Estudio - Portfolio Website

A Next.js portfolio website for EME Estudio, a tufting and textile art studio.

## Project Status

### ✅ **COMPLETE - Production Ready!**

All features have been implemented and the website is ready for deployment.

**Foundation & Authentication:**
- [x] Next.js 15 project with TypeScript
- [x] Tailwind CSS with custom design system
- [x] Prisma + PostgreSQL database
- [x] NextAuth v5 credentials authentication
- [x] Protected admin routes with middleware
- [x] Cloudinary integration

**Admin Panel:**
- [x] Dashboard with stats and quick actions
- [x] Product CRUD (create, edit, delete, visibility toggle)
- [x] Drag-and-drop image upload (up to 10 images per product)
- [x] Image reordering and management
- [x] Category management
- [x] Content editor (About, Contact, Hero)
- [x] Settings (GA4, SEO metadata)
- [x] Search and filter functionality

**Public Website:**
- [x] Homepage with hero section (featured products)
- [x] Portfolio grid with category filters
- [x] Lightbox with keyboard navigation
- [x] About page (dynamic content)
- [x] Contact page (email, Instagram)
- [x] Responsive navigation
- [x] SEO metadata (dynamic from settings)
- [x] Google Analytics 4 integration
- [x] Mobile responsive design

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Railway recommended)
- Cloudinary account (free tier)

### Installation

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables:**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

   Fill in your values:
   - `DATABASE_URL`: PostgreSQL connection string from Railway
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: From cloudinary.com
   - `CLOUDINARY_API_KEY`: From cloudinary.com
   - `CLOUDINARY_API_SECRET`: From cloudinary.com

3. **Initialize database:**
   \`\`\`bash
   npm run db:push
   npm run db:seed
   \`\`\`

4. **Run development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

   Visit http://localhost:3000

### Admin Access

After seeding, login at `/login` with:
- **Email:** admin@emeestudio.com
- **Password:** admin123

⚠️ **Change this password immediately after first login!**

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed initial data
- `npm run db:studio` - Open Prisma Studio

## Project Structure

\`\`\`
eme-estudio-portfolio/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin panel pages
│   ├── login/             # Login page
│   ├── portfolio/         # Public portfolio
│   ├── about/             # About page
│   └── contact/           # Contact page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── admin/            # Admin-specific components
│   ├── portfolio/        # Portfolio components
│   └── layout/           # Layout components
├── lib/                   # Utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── cloudinary.ts     # Cloudinary helpers
│   └── utils.ts          # General utilities
└── prisma/               # Database
    ├── schema.prisma     # Database schema
    └── seed.ts           # Seed script
\`\`\`

## Database Schema

- **Admin**: Admin users (credentials auth)
- **Product**: Portfolio items with images
- **Image**: Product images (stored in Cloudinary)
- **Category**: Product categories (Rugs, Wall Art, Custom)
- **Content**: Editable site content (About, Contact)
- **Settings**: Site settings (GA4, metadata)

## Design System

### Colors
- Neutral: `#fafafa` → `#171717` (50-900)
- Accent: `#8b7355` (warm taupe)

### Typography
- Sans: Inter
- Display: Libre Baskerville

### Layout Principles
- Generous white space
- Product images as primary focus
- Minimal borders, subtle shadows
- Sharp corners (0px) or very subtle (2px)
- Fast transitions (200ms)

## Features

### Admin Panel
- **Dashboard**: Overview stats, recent products, quick actions
- **Products**: Full CRUD with search, filters, and bulk actions
- **Image Management**: Drag-and-drop upload, reordering, automatic Cloudinary optimization
- **Categories**: Organize products into collections
- **Content**: Edit About, Contact, and Hero sections without code
- **Settings**: Configure GA4 tracking and SEO metadata

### Public Website
- **Hero Section**: Full-screen hero with featured product background
- **Portfolio Grid**: Responsive masonry layout with category filters
- **Lightbox**: Full-screen image viewer with keyboard navigation (arrow keys, ESC)
- **Dynamic Content**: All text editable via admin panel
- **SEO**: Dynamic metadata from settings, Open Graph tags
- **Analytics**: Google Analytics 4 integration

## Deployment

### Railway Deployment

1. **Create Railway Project:**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login and create project
   railway login
   railway init
   ```

2. **Add PostgreSQL:**
   - Go to Railway dashboard
   - Add PostgreSQL database
   - Copy `DATABASE_URL` from database settings

3. **Set Environment Variables:**
   In Railway dashboard, add:
   - `DATABASE_URL` (from PostgreSQL)
   - `NEXTAUTH_URL` (your Railway domain)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Initialize Database:**
   ```bash
   railway run npm run db:push
   railway run npm run db:seed
   ```

6. **Custom Domain (Optional):**
   - Go to Settings → Domains
   - Add your custom domain

## Quick Start Guide

1. **Setup Environment:**
   ```bash
   cp .env.example .env.local
   # Fill in your values
   ```

2. **Install & Initialize:**
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```

3. **Login to Admin:**
   - Visit http://localhost:3000/login
   - Email: `admin@emeestudio.com`
   - Password: `admin123`
   - **⚠️ Change this password immediately!**

4. **Upload Your First Product:**
   - Go to Products → New Product
   - Add title, description, images
   - Set as Featured to show on homepage
   - Click Create

5. **Customize Content:**
   - Go to Content to edit About/Contact text
   - Go to Settings to add GA4 tracking

## Tips & Best Practices

### Image Guidelines
- **Format**: JPG, PNG, or WebP
- **Size**: Up to 10MB per image
- **Dimensions**: Min 1200px width recommended
- **Quality**: Cloudinary will automatically optimize
- **First image**: Used as thumbnail in portfolio grid

### SEO Optimization
- Update site title/description in Settings
- Use descriptive product titles
- Add alt text to images (product title used by default)
- Enable GA4 tracking to monitor traffic

### Content Management
- **About Page**: Tell your story, process, inspiration
- **Hero Text**: Keep it short and impactful
- **Product Descriptions**: Include materials, dimensions, care instructions
- **Categories**: Use broad categories (Rugs, Wall Art, Custom)

## Support

For issues or questions about this codebase, refer to the specification in the project documentation.
