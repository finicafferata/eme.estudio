import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateLocation() {
  try {
    // Update EME Studio location
    const updated = await prisma.location.updateMany({
      where: {
        name: {
          contains: 'EME Studio'
        }
      },
      data: {
        name: 'EME Studio',
        address: 'José Penna 989, San Isidro'
      }
    })

    console.log(`✅ Updated ${updated.count} location(s)`)

    // Also check if there are any other locations with the old address
    const oldAddressLocations = await prisma.location.updateMany({
      where: {
        address: {
          contains: 'Av. Corrientes 1234'
        }
      },
      data: {
        address: 'José Penna 989, San Isidro'
      }
    })

    if (oldAddressLocations.count > 0) {
      console.log(`✅ Updated ${oldAddressLocations.count} additional location(s) with old address`)
    }

    // List all locations to verify
    const allLocations = await prisma.location.findMany()
    console.log('\n📍 Current locations:')
    allLocations.forEach(loc => {
      console.log(`  - ${loc.name}: ${loc.address}`)
    })

  } catch (error) {
    console.error('Error updating location:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateLocation()