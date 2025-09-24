import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.package.deleteMany()
  await prisma.class.deleteMany()
  await prisma.publicRegistration.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.holiday.deleteMany()
  await prisma.recurringClassPattern.deleteMany()
  await prisma.instructor.deleteMany()
  await prisma.user.deleteMany()
  await prisma.classType.deleteMany()
  await prisma.location.deleteMany()

  // Create password hash
  const defaultPassword = await hash('eme2025!', 12)

  // 1. Create Users
  console.log('👥 Creating users...')

  // Admin/Instructor Users (Male and Meri)
  const male = await prisma.user.create({
    data: {
      email: 'male@emeestudio.com',
      passwordHash: defaultPassword,
      firstName: 'Male',
      lastName: 'EME Studio',
      phone: '+54 11 2222-1111',
      instagramHandle: '@male_eme',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2025-01-01'),
      registeredAt: new Date('2025-01-01'),
    },
  })

  const meri = await prisma.user.create({
    data: {
      email: 'meri@emeestudio.com',
      passwordHash: defaultPassword,
      firstName: 'Meri',
      lastName: 'EME Studio',
      phone: '+54 11 2222-2222',
      instagramHandle: '@meri_eme',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2025-01-01'),
      registeredAt: new Date('2025-01-01'),
    },
  })

  // Test Students
  const maria = await prisma.user.create({
    data: {
      email: 'maria.garcia@example.com',
      passwordHash: defaultPassword,
      firstName: 'María',
      lastName: 'García',
      phone: '+54 11 3333-1111',
      instagramHandle: '@maria_garcia',
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2025-08-15'),
      registeredAt: new Date('2025-08-15'),
    },
  })

  const juan = await prisma.user.create({
    data: {
      email: 'juan.lopez@example.com',
      passwordHash: defaultPassword,
      firstName: 'Juan',
      lastName: 'López',
      phone: '+54 11 3333-2222',
      instagramHandle: '@juan_lopez',
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2025-08-01'),
      registeredAt: new Date('2025-08-01'),
    },
  })

  const sofia = await prisma.user.create({
    data: {
      email: 'sofia.martinez@example.com',
      passwordHash: defaultPassword,
      firstName: 'Sofía',
      lastName: 'Martínez',
      phone: '+54 11 3333-3333',
      instagramHandle: '@sofia_martinez',
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2025-09-01'),
      registeredAt: new Date('2025-09-01'),
    },
  })

  const carlos = await prisma.user.create({
    data: {
      email: 'carlos.ruiz@example.com',
      passwordHash: defaultPassword,
      firstName: 'Carlos',
      lastName: 'Ruiz',
      phone: '+54 11 3333-4444',
      instagramHandle: '@carlos_ruiz',
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2025-06-15'),
      registeredAt: new Date('2025-06-15'),
    },
  })

  // 2. Create Instructors
  console.log('🏫 Creating instructors...')

  const instructorMale = await prisma.instructor.create({
    data: {
      userId: male.id,
      specialties: ['Tufting', 'Tapices', 'Alfombras', 'Workshops'],
      bio: 'Instructor principal de EME Studio con más de 5 años de experiencia en tufting.',
      hourlyRate: 25000.00,
      isAvailable: true,
    },
  })

  const instructorMeri = await prisma.instructor.create({
    data: {
      userId: meri.id,
      specialties: ['Tufting', 'Diseño textil', 'Arte fibra', 'Workshops'],
      bio: 'Co-fundadora de EME Studio, especialista en técnicas avanzadas de tufting.',
      hourlyRate: 25000.00,
      isAvailable: true,
    },
  })

  // 3. Create Locations
  console.log('📍 Creating locations...')

  const principalLocation = await prisma.location.create({
    data: {
      name: 'EME Studio',
      slug: 'eme-principal',
      address: 'José Penna 989, San Isidro',
      capacity: 6,
      amenities: ['Telares', 'Herramientas completas', 'Materiales incluidos', 'Café', 'Wi-Fi'],
      isActive: true,
    },
  })

  const workshopLocation = await prisma.location.create({
    data: {
      name: 'Sala de Workshops',
      slug: 'sala-workshops',
      address: 'Mismo edificio, Planta Alta',
      capacity: 4,
      amenities: ['Telar grande', 'Espacio amplio', 'Proyector', 'Audio'],
      isActive: true,
    },
  })

  // 4. Create Class Types
  console.log('📚 Creating class types...')

  const intensivo = await prisma.classType.create({
    data: {
      name: 'Intensivo',
      slug: 'intensivo',
      description: 'Paquete intensivo de tufting - 3 clases para aprender la técnica completa',
      durationMinutes: 150, // 2.5 hours
      defaultPrice: 145000.00, // $145,000 pesos
      maxCapacity: 6,
      isActive: true,
    },
  })

  const recurrente = await prisma.classType.create({
    data: {
      name: 'Recurrente',
      slug: 'recurrente',
      description: 'Paquete recurrente de tufting - 4 clases para perfeccionar técnicas',
      durationMinutes: 150, // 2.5 hours
      defaultPrice: 170000.00, // $170,000 pesos
      maxCapacity: 6,
      isActive: true,
    },
  })

  // 5. Create Packages
  console.log('📦 Creating packages...')

  const mariaPackage = await prisma.package.create({
    data: {
      userId: maria.id,
      name: 'Intensivo - María García',
      classTypeId: intensivo.id,
      totalCredits: 3,
      usedCredits: 1,
      price: 145000.00,
      purchasedAt: new Date('2025-09-01'),
      expiresAt: new Date('2025-12-01'),
      status: 'ACTIVE',
      metadata: {
        notes: 'Pago en efectivo - 2 cuotas',
        paymentPlan: 'partial'
      },
    },
  })

  const juanPackage = await prisma.package.create({
    data: {
      userId: juan.id,
      name: 'Recurrente - Juan López',
      classTypeId: recurrente.id,
      totalCredits: 4,
      usedCredits: 2,
      price: 170000.00,
      purchasedAt: new Date('2025-08-15'),
      expiresAt: new Date('2025-11-15'),
      status: 'ACTIVE',
      metadata: {
        notes: 'Transferencia a Meri - Pago completo',
        paymentPlan: 'full'
      },
    },
  })

  const sofiaPackage = await prisma.package.create({
    data: {
      userId: sofia.id,
      name: 'Intensivo - Sofía Martínez',
      classTypeId: intensivo.id,
      totalCredits: 3,
      usedCredits: 0,
      price: 145000.00,
      purchasedAt: new Date('2025-09-10'),
      expiresAt: new Date('2025-12-10'),
      status: 'ACTIVE',
      metadata: {
        notes: 'Pago en USD - 2 cuotas',
        paymentPlan: 'partial',
        currency: 'USD'
      },
    },
  })

  const carlosPackage = await prisma.package.create({
    data: {
      userId: carlos.id,
      name: 'Recurrente - Carlos Ruiz',
      classTypeId: recurrente.id,
      totalCredits: 4,
      usedCredits: 4,
      price: 170000.00,
      purchasedAt: new Date('2025-07-01'),
      expiresAt: new Date('2025-10-01'),
      status: 'USED_UP',
      metadata: {
        notes: 'Efectivo pesos - Paquete completado',
        paymentPlan: 'full'
      },
    },
  })

  // 6. Create Classes - September 2025 Schedule
  console.log('🗓️  Creating classes...')

  // Past class (for history)
  const pastClass = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-15T13:00:00Z'), // Last week Monday 10am Buenos Aires
      endsAt: new Date('2025-09-15T15:30:00Z'),
      capacity: 6,
      status: 'COMPLETED',
      notes: 'Clase completada exitosamente',
    },
  })

  // Current week classes (September 22-28, 2025)
  const mondayMorning = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-22T13:00:00Z'), // Monday 10am Buenos Aires
      endsAt: new Date('2025-09-22T15:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const mondayEvening = await prisma.class.create({
    data: {
      classTypeId: recurrente.id,
      instructorId: instructorMeri.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-22T21:00:00Z'), // Monday 6pm Buenos Aires
      endsAt: new Date('2025-09-22T23:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const tuesdayMorning = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-23T13:00:00Z'), // Tuesday 10am Buenos Aires
      endsAt: new Date('2025-09-23T15:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const tuesdayAfternoon = await prisma.class.create({
    data: {
      classTypeId: recurrente.id,
      instructorId: instructorMeri.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-23T18:00:00Z'), // Tuesday 3pm Buenos Aires
      endsAt: new Date('2025-09-23T20:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const wednesdayMorning = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMeri.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-24T13:00:00Z'), // Wednesday 10am Buenos Aires
      endsAt: new Date('2025-09-24T15:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const wednesdayEvening = await prisma.class.create({
    data: {
      classTypeId: recurrente.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-24T21:00:00Z'), // Wednesday 6pm Buenos Aires
      endsAt: new Date('2025-09-24T23:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const thursdayMorning = await prisma.class.create({
    data: {
      classTypeId: recurrente.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-25T13:00:00Z'), // Thursday 10am Buenos Aires
      endsAt: new Date('2025-09-25T15:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const thursdayAfternoon = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMeri.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-25T18:00:00Z'), // Thursday 3pm Buenos Aires
      endsAt: new Date('2025-09-25T20:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const fridayMorning = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMeri.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-26T13:00:00Z'), // Friday 10am Buenos Aires
      endsAt: new Date('2025-09-26T15:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const fridayAfternoon = await prisma.class.create({
    data: {
      classTypeId: recurrente.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-26T17:00:00Z'), // Friday 2pm Buenos Aires
      endsAt: new Date('2025-09-26T19:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  const saturdayMorning = await prisma.class.create({
    data: {
      classTypeId: intensivo.id,
      instructorId: instructorMale.id,
      locationId: principalLocation.id,
      startsAt: new Date('2025-09-27T13:00:00Z'), // Saturday 10am Buenos Aires
      endsAt: new Date('2025-09-27T15:30:00Z'),
      capacity: 6,
      status: 'SCHEDULED',
    },
  })

  // 7. Create Reservations
  console.log('📅 Creating reservations...')

  // María attended past class
  await prisma.reservation.create({
    data: {
      userId: maria.id,
      classId: pastClass.id,
      packageId: mariaPackage.id,
      status: 'COMPLETED',
      reservedAt: new Date('2025-09-10T10:00:00Z'),
      checkedInAt: new Date('2025-09-15T12:55:00Z'),
      notes: 'Primera clase del paquete intensivo',
    },
  })

  // Juan has upcoming booking
  await prisma.reservation.create({
    data: {
      userId: juan.id,
      classId: mondayEvening.id,
      packageId: juanPackage.id,
      status: 'CONFIRMED',
      reservedAt: new Date('2025-09-18T14:00:00Z'),
      notes: 'Tercera clase del paquete recurrente',
    },
  })

  // Sofia has future booking
  await prisma.reservation.create({
    data: {
      userId: sofia.id,
      classId: wednesdayMorning.id,
      packageId: sofiaPackage.id,
      status: 'CONFIRMED',
      reservedAt: new Date('2025-09-20T16:00:00Z'),
      notes: 'Primera clase - paquete nuevo',
    },
  })

  // 8. Create Payments
  console.log('💳 Creating payments...')

  // Juan - Full payment for Recurrente (Transfer to Meri)
  await prisma.payment.create({
    data: {
      userId: juan.id,
      packageId: juanPackage.id,
      amount: 170000.00,
      currency: 'ARS',
      paymentMethod: 'TRANSFER_TO_MERI_PESOS',
      status: 'COMPLETED',
      paidAt: new Date('2025-08-15T00:00:00Z'),
      description: 'Pago completo paquete Recurrente - Transferencia a Meri',
      metadata: {
        transferReference: 'TRF-001-2025',
        bankAccount: 'Meri EME Studio'
      },
    },
  })

  // Carlos - Full payment for Recurrente (Cash)
  await prisma.payment.create({
    data: {
      userId: carlos.id,
      packageId: carlosPackage.id,
      amount: 170000.00,
      currency: 'ARS',
      paymentMethod: 'CASH_PESOS',
      status: 'COMPLETED',
      paidAt: new Date('2025-07-01T00:00:00Z'),
      description: 'Pago completo paquete Recurrente - Efectivo pesos',
      metadata: {
        receivedBy: 'Male',
        receipt: 'REC-001-2025'
      },
    },
  })

  // María - First partial payment (Cash)
  await prisma.payment.create({
    data: {
      userId: maria.id,
      packageId: mariaPackage.id,
      amount: 70000.00,
      currency: 'ARS',
      paymentMethod: 'CASH_PESOS',
      status: 'COMPLETED',
      paidAt: new Date('2025-09-01T00:00:00Z'),
      description: 'Pago parcial 1/2 - Intensivo - Efectivo pesos',
      metadata: {
        receivedBy: 'Meri',
        receipt: 'REC-002-2025',
        installment: '1/2'
      },
    },
  })

  // María - Second partial payment (Transfer to Male)
  await prisma.payment.create({
    data: {
      userId: maria.id,
      packageId: mariaPackage.id,
      amount: 75000.00,
      currency: 'ARS',
      paymentMethod: 'TRANSFER_TO_MALE_PESOS',
      status: 'COMPLETED',
      paidAt: new Date('2025-09-05T00:00:00Z'),
      description: 'Pago parcial 2/2 - Intensivo - Transferencia a Male',
      metadata: {
        transferReference: 'TRF-002-2025',
        bankAccount: 'Male EME Studio',
        installment: '2/2'
      },
    },
  })

  // Sofia - First USD payment (Cash)
  await prisma.payment.create({
    data: {
      userId: sofia.id,
      packageId: sofiaPackage.id,
      amount: 300.00,
      currency: 'USD',
      paymentMethod: 'CASH_USD',
      status: 'COMPLETED',
      paidAt: new Date('2025-09-10T00:00:00Z'),
      description: 'Pago parcial 1/2 - Intensivo - Efectivo USD',
      metadata: {
        receivedBy: 'Male',
        receipt: 'REC-003-2025',
        installment: '1/2',
        exchangeRate: '480.00'
      },
    },
  })

  // Sofia - Second USD payment (Transfer - Pending)
  await prisma.payment.create({
    data: {
      userId: sofia.id,
      packageId: sofiaPackage.id,
      amount: 200.00,
      currency: 'USD',
      paymentMethod: 'TRANSFER_IN_USD',
      status: 'PENDING',
      description: 'Pago parcial 2/2 - Intensivo - Transferencia USD (Pendiente)',
      metadata: {
        installment: '2/2',
        expectedDate: '2025-09-25',
        bankDetails: 'Wise USD Account'
      },
    },
  })

  // 9. Create System Settings
  console.log('⚙️  Creating system settings...')

  const settings = [
    {
      key: 'cancellation_policy_hours',
      value: '24',
      valueType: 'INTEGER' as const,
      description: 'Minimum hours before class to cancel without penalty',
      isPublic: true,
    },
    {
      key: 'package_validity_months',
      value: '3',
      valueType: 'INTEGER' as const,
      description: 'Default validity period for all packages in months',
      isPublic: false,
    },
    {
      key: 'class_reminder_hours',
      value: '2',
      valueType: 'INTEGER' as const,
      description: 'Send reminder email X hours before class',
      isPublic: false,
    },
    {
      key: 'max_advance_booking_days',
      value: '30',
      valueType: 'INTEGER' as const,
      description: 'Maximum days in advance students can book',
      isPublic: true,
    },
    {
      key: 'studio_timezone',
      value: 'America/Argentina/Buenos_Aires',
      valueType: 'STRING' as const,
      description: 'Studio timezone for scheduling',
      isPublic: false,
    },
    {
      key: 'default_class_capacity',
      value: '6',
      valueType: 'INTEGER' as const,
      description: 'Default maximum capacity per class',
      isPublic: false,
    },
    {
      key: 'intensivo_price',
      value: '145000.00',
      valueType: 'DECIMAL' as const,
      description: 'Intensivo package price (3 classes)',
      isPublic: true,
    },
    {
      key: 'recurrente_price',
      value: '170000.00',
      valueType: 'DECIMAL' as const,
      description: 'Recurrente package price (4 classes)',
      isPublic: true,
    },
    {
      key: 'allow_partial_payment_intensivo',
      value: 'true',
      valueType: 'BOOLEAN' as const,
      description: 'Allow partial payments for Intensivo packages',
      isPublic: false,
    },
    {
      key: 'allow_partial_payment_recurrente',
      value: 'false',
      valueType: 'BOOLEAN' as const,
      description: 'Partial payments not allowed for Recurrente packages',
      isPublic: false,
    },
  ]

  for (const setting of settings) {
    await prisma.systemSetting.create({ data: setting })
  }

  // 10. Create Public Registrations
  console.log('📝 Creating public registrations...')

  await prisma.publicRegistration.create({
    data: {
      firstName: 'Laura',
      lastName: 'Silva',
      email: 'laura.silva@example.com',
      phone: '+54 11 9876-5432',
      classType: 'Recurrente',
      preferredDate: new Date('2025-09-25'),
      preferredTime: '18:00',
      message: 'Me interesa el paquete recurrente. ¿Tienen disponibilidad?',
      status: 'PROCESSED',
      processedAt: new Date('2025-09-10T00:00:00Z'),
      processedBy: male.id,
      userId: sofia.id, // Connected to existing user
    },
  })

  await prisma.publicRegistration.create({
    data: {
      firstName: 'Ana',
      lastName: 'Morales',
      email: 'ana.morales@example.com',
      phone: '+54 11 5555-1234',
      classType: 'Intensivo',
      preferredDate: new Date('2025-10-01'),
      preferredTime: '10:00',
      message: '¿Aceptan pagos en dólares? Me interesa el curso intensivo.',
      status: 'PENDING',
    },
  })

  await prisma.publicRegistration.create({
    data: {
      firstName: 'Roberto',
      lastName: 'Fernández',
      email: 'roberto.fernandez@example.com',
      phone: '+54 11 7777-8888',
      classType: 'Intensivo',
      preferredDate: new Date('2025-10-05'),
      preferredTime: '14:00',
      message: 'Quisiera información sobre los horarios disponibles para octubre.',
      status: 'PENDING',
    },
  })

  // 11. Create Holiday (for scheduling)
  console.log('🎉 Creating holidays...')

  await prisma.holiday.create({
    data: {
      name: 'Día de la Independencia',
      date: new Date('2025-07-09'),
      isRecurring: true,
    },
  })

  await prisma.holiday.create({
    data: {
      name: 'Navidad',
      date: new Date('2025-12-25'),
      isRecurring: true,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('')
  console.log('📊 Seeded data summary:')
  console.log('👥 Users: 5 (2 admins/instructors, 4 students)')
  console.log('📚 Class Types: 2 (Intensivo, Recurrente)')
  console.log('📍 Locations: 2 (Principal, Workshop)')
  console.log('📦 Packages: 4 (different payment scenarios)')
  console.log('🗓️  Classes: 12 (September 2025 schedule)')
  console.log('📅 Reservations: 3 (mixed status)')
  console.log('💳 Payments: 6 (pesos and USD, various methods)')
  console.log('⚙️  Settings: 10 (business rules)')
  console.log('📝 Public Registrations: 3 (lead management)')
  console.log('🎉 Holidays: 2 (scheduling reference)')
  console.log('')
  console.log('🔑 Default password for all users: eme2025!')
  console.log('📧 Admin emails:')
  console.log('   - male@emeestudio.com')
  console.log('   - meri@emeestudio.com')
  console.log('')
  console.log('💡 Test scenarios included:')
  console.log('   - Partial payments (Intensivo only)')
  console.log('   - Full payments (Recurrente)')
  console.log('   - Mixed currencies (ARS/USD)')
  console.log('   - Different payment methods')
  console.log('   - Active/expired/used packages')
  console.log('   - Completed/upcoming reservations')
  console.log('   - Lead management workflow')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })