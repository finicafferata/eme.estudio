const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function consolidateClassTypes() {
  try {
    console.log('🔄 Starting class type consolidation...')

    // 1. Create a new unified "Tufting Class" type
    console.log('📝 Creating unified Tufting Class type...')
    const tufting = await prisma.classType.upsert({
      where: { slug: 'tufting' },
      update: {},
      create: {
        name: 'Tufting Class',
        slug: 'tufting',
        description: 'Aprende la técnica de tufting con nuestros marcos disponibles en diferentes tamaños',
        durationMinutes: 120, // 2 hours default
        defaultPrice: 35, // Default price
        maxCapacity: 6, // Total capacity
        isActive: true
      }
    })

    console.log(`✅ Created/found Tufting Class with ID: ${tufting.id}`)

    // 2. Update all existing classes to use the new unified type
    console.log('🔄 Updating existing classes...')

    // Get current class types
    const intensivo = await prisma.classType.findUnique({ where: { slug: 'intensivo' } })
    const recurrente = await prisma.classType.findUnique({ where: { slug: 'recurrente' } })

    if (intensivo) {
      const intensivoClassesCount = await prisma.class.updateMany({
        where: { classTypeId: intensivo.id },
        data: {
          classTypeId: tufting.id,
          // Set default frame capacities for existing classes
          smallFrameCapacity: 2,
          mediumFrameCapacity: 3,
          largeFrameCapacity: 1
        }
      })
      console.log(`✅ Updated ${intensivoClassesCount.count} Intensivo classes`)
    }

    if (recurrente) {
      const recurrenteClassesCount = await prisma.class.updateMany({
        where: { classTypeId: recurrente.id },
        data: {
          classTypeId: tufting.id,
          // Set default frame capacities for existing classes
          smallFrameCapacity: 2,
          mediumFrameCapacity: 3,
          largeFrameCapacity: 1
        }
      })
      console.log(`✅ Updated ${recurrenteClassesCount.count} Recurrente classes`)
    }

    // 3. Update packages to use the new class type
    console.log('🔄 Updating packages...')

    if (intensivo) {
      const intensivoPackagesCount = await prisma.package.updateMany({
        where: { classTypeId: intensivo.id },
        data: { classTypeId: tufting.id }
      })
      console.log(`✅ Updated ${intensivoPackagesCount.count} Intensivo packages`)
    }

    if (recurrente) {
      const recurrentePackagesCount = await prisma.package.updateMany({
        where: { classTypeId: recurrente.id },
        data: { classTypeId: tufting.id }
      })
      console.log(`✅ Updated ${recurrentePackagesCount.count} Recurrente packages`)
    }

    // 4. Deactivate old class types (don't delete to preserve data integrity)
    console.log('🔄 Deactivating old class types...')

    if (intensivo) {
      await prisma.classType.update({
        where: { id: intensivo.id },
        data: {
          isActive: false,
          name: 'Intensivo (Legacy)',
          description: 'Legacy class type - migrated to Tufting Class'
        }
      })
      console.log('✅ Deactivated Intensivo class type')
    }

    if (recurrente) {
      await prisma.classType.update({
        where: { id: recurrente.id },
        data: {
          isActive: false,
          name: 'Recurrente (Legacy)',
          description: 'Legacy class type - migrated to Tufting Class'
        }
      })
      console.log('✅ Deactivated Recurrente class type')
    }

    // 5. Verify the consolidation
    console.log('🔍 Verifying consolidation...')
    const tufting_classes = await prisma.class.count({
      where: { classTypeId: tufting.id }
    })
    const active_class_types = await prisma.classType.count({
      where: { isActive: true }
    })

    console.log(`✅ Total classes using Tufting Class: ${tufting_classes}`)
    console.log(`✅ Active class types: ${active_class_types}`)

    console.log('🎉 Class type consolidation completed successfully!')

  } catch (error) {
    console.error('❌ Error during consolidation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

consolidateClassTypes()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })