# Getting Started with EME Estudio Portfolio

## 🚀 Quick Setup (5 minutes)

### Step 1: Set Up External Services

#### Railway (PostgreSQL Database)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project → Add PostgreSQL
4. Copy the `DATABASE_URL` from the database settings

#### Cloudinary (Image Hosting)
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Go to Dashboard
4. Copy:
   - Cloud Name
   - API Key
   - API Secret

### Step 2: Configure Environment

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Railway PostgreSQL URL (from Railway dashboard)
DATABASE_URL="postgresql://postgres:..."

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Cloudinary (from Cloudinary dashboard)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### Step 3: Install and Run

```bash
# Install dependencies
npm install

# Push database schema to Railway
npm run db:push

# Seed initial data (admin user + categories)
npm run db:seed

# Start development server
npm run dev
```

Open http://localhost:3000 🎉

---

## 🔐 First Login

1. Go to http://localhost:3000/login
2. Login with:
   - **Email**: `admin@emeestudio.com`
   - **Password**: `admin123`
3. **⚠️ IMPORTANT**: Change this password immediately!

---

## 📝 Your First Product

1. **Navigate to Products** (from sidebar)
2. **Click "New Product"**
3. **Fill in details:**
   - Title: "Sunset Waves Rug"
   - Description: "Handtufted rug featuring warm sunset colors..."
   - Category: Select "Rugs"
4. **Upload images:**
   - Drag and drop 1-10 images
   - First image becomes the thumbnail
   - Use arrow buttons to reorder
5. **Set options:**
   - ✅ Featured (shows on homepage)
   - ✅ Visible (shows in portfolio)
6. **Click "Create Product"**

---

## 🎨 Customize Your Site

### Edit Content
Go to **Content** in admin sidebar:
- **About Us**: Your studio story
- **Contact Email**: Your email address
- **Instagram Handle**: @yourusername
- **Hero Title**: Main heading on homepage
- **Hero Subtitle**: Tagline

### Configure Settings
Go to **Settings** in admin sidebar:
- **Site Title**: For browser tab & SEO
- **Site Description**: For search engines
- **GA4 Measurement ID**: Google Analytics (optional)

### Manage Categories
Go to **Categories** in admin sidebar:
- Create categories like "Rugs", "Wall Art", "Custom"
- Products can be filtered by category in portfolio

---

## 🌐 View Your Site

- **Homepage**: http://localhost:3000
- **Portfolio**: http://localhost:3000/portfolio
- **About**: http://localhost:3000/about
- **Contact**: http://localhost:3000/contact
- **Admin Panel**: http://localhost:3000/admin

---

## 📦 Deploy to Production

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing Railway project (with database)
railway link

# Set environment variables in Railway dashboard
# (same as .env.local but with production URLs)

# Deploy
railway up

# Initialize production database
railway run npm run db:push
railway run npm run db:seed
```

Your site will be live at: `https://your-project.railway.app`

### Option 2: Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. Add environment variables
5. Deploy

**Note**: You'll still need Railway for the PostgreSQL database.

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Run production build

# Database
npm run db:push          # Push schema changes
npm run db:seed          # Seed data
npm run db:studio        # Open Prisma Studio (visual DB editor)
npm run db:generate      # Regenerate Prisma client

# Code Quality
npm run lint             # Run ESLint
```

---

## 💡 Tips

### Image Best Practices
- **Size**: 1200-2000px width recommended
- **Format**: JPG for photos, PNG for graphics
- **File size**: Up to 10MB (Cloudinary optimizes automatically)
- **First image**: Used as thumbnail in portfolio grid

### Featured Products
- Mark 1-2 products as "Featured"
- Featured products rotate on homepage hero
- Most recent featured product shows first

### Categories
- Keep it simple: 3-5 categories max
- Use broad categories: "Rugs", "Wall Art", "Custom"
- Products can belong to one category or none

### SEO
- Add descriptive titles and descriptions
- First 160 characters of description are important
- Update site metadata in Settings
- Add GA4 for traffic insights

---

## ❓ Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` in `.env.local`
- Make sure Railway PostgreSQL is running
- Run `npm run db:push` to sync schema

### "Image upload failed"
- Verify Cloudinary credentials in `.env.local`
- Check file size (max 10MB)
- Ensure file is an image (JPG, PNG, WebP)

### "Cannot login"
- Make sure you ran `npm run db:seed`
- Check email is `admin@emeestudio.com`
- Password is `admin123` (after seed)
- Clear browser cookies and try again

### Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

---

## 📚 Next Steps

1. ✅ Upload 5-10 products
2. ✅ Customize About page
3. ✅ Add your social links
4. ✅ Set featured products
5. ✅ Configure SEO metadata
6. ✅ Add GA4 tracking
7. ✅ Deploy to production
8. ✅ Test on mobile devices

---

## 🆘 Need Help?

- Check the main [README.md](./README.md)
- Review the [specification document](./CLAUDE.md)
- Open Prisma Studio: `npm run db:studio`
- Check Railway logs in dashboard
- Verify Cloudinary uploads in media library

---

**You're all set!** 🎉

Start adding your textile art and share your portfolio with the world.
