import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@emeestudio.com' },
    update: {},
    create: {
      email: 'admin@emeestudio.com',
      password_hash: hashedPassword,
      name: 'EME Admin'
    }
  })
  console.log('✅ Created admin user:', admin.email)

  // Create default categories
  const categories = [
    { name: 'Rugs', slug: 'rugs', description: 'Handmade tufted rugs', order: 1 },
    { name: 'Wall Art', slug: 'wall-art', description: 'Textile wall hangings', order: 2 },
    { name: 'Custom', slug: 'custom', description: 'Custom commissioned pieces', order: 3 }
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    })
    console.log('✅ Created category:', cat.name)
  }

  // Create default content
  const content = [
    {
      key: 'about',
      value: 'EME Estudio is a tufting studio dedicated to creating unique textile art pieces. Each piece is handcrafted with attention to detail, combining traditional techniques with contemporary design.'
    },
    { key: 'contact_email', value: 'hello@emeestudio.com' },
    { key: 'instagram_handle', value: '@e.m.e.estudio' },
    { key: 'hero_title', value: 'EME Estudio' },
    { key: 'hero_subtitle', value: 'Tufting & Textile Art' }
  ]

  for (const c of content) {
    await prisma.content.upsert({
      where: { key: c.key },
      update: {},
      create: c
    })
    console.log('✅ Created content:', c.key)
  }

  // Create default settings
  const settings = [
    { key: 'site_title', value: 'EME Estudio - Tufting & Textile Art' },
    { key: 'site_description', value: 'Handcrafted textile art, tufted rugs, and wall hangings by EME Estudio' },
    { key: 'ga4_measurement_id', value: '' }
  ]

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: {},
      create: s
    })
    console.log('✅ Created setting:', s.key)
  }

  console.log('🎉 Database seeded successfully!')
  console.log('\n📝 Admin credentials:')
  console.log('   Email: admin@emeestudio.com')
  console.log('   Password: admin123')
  console.log('\n⚠️  Remember to change the admin password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
