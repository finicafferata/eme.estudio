// Translation strings for the booking system

export const translations = {
  es: {
    // Email stage
    emailTitle: 'Ingresa tu Correo Electrónico',
    emailSubtitle: 'Verificaremos si tienes una cuenta o paquetes existentes',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'tu@correo.com',

    // Common buttons
    cancel: 'Cancelar',
    continue: 'Continuar',
    back: 'Volver',
    changeType: 'Cambiar Tipo',
    reviewBooking: 'Revisar Reserva',
    confirmBooking: 'Confirmar Reserva',
    checking: 'Verificando...',
    booking: 'Reservando...',

    // Registration type stage
    registrationTitle: 'Selecciona el Tipo de Registro',
    welcomeBack: '¡Bienvenido de nuevo',
    activePackages: 'Tienes {{count}} paquete(s) activo(s)',

    // Course types
    intensiveCourse: 'Curso Intensivo',
    recurrentCourse: 'Curso Recurrente',

    // Frame size
    frameSizeLabel: 'Tamaño del Bastidor',
    frameSizeGuide: 'Guía de Tamaños:',
    smallFrame: 'Pequeño (20x20cm)',
    mediumFrame: 'Mediano (30x30cm)',
    largeFrame: 'Grande (40x40cm)',
    smallFrameDesc: 'Perfecto para principiantes y proyectos pequeños',
    mediumFrameDesc: 'Tamaño más popular, ideal para arte de pared',
    largeFrameDesc: 'Excelente para piezas destacadas',

    // Package info
    frameSizeSmallOnly: 'Tamaño del bastidor: Solo PEQUEÑO',
    frameSizeChoose: 'Tamaño del bastidor: Elige entre los tamaños disponibles',
    hasPackageIntensive: '✓ Tienes un paquete intensivo con créditos',
    hasPackageRecurrent: '✓ Tienes un paquete recurrente con créditos',
    paymentRequired: '• Pago requerido dentro de 24 horas',
    selectPackage: 'Seleccionar paquete a usar',
    creditsRemaining: '{{credits}} créditos restantes',

    // Details stage
    detailsTitle: 'Completa tus Datos',
    yourUsualType: 'Tu tipo habitual',
    firstName: 'Nombre',
    firstNamePlaceholder: 'Nombre',
    lastName: 'Apellido',
    lastNamePlaceholder: 'Apellido',

    // Frame availability
    available: 'disponible',
    soldOut: 'Agotado',

    // Storage options
    rememberInfo: 'Recordar mi información para futuras reservas',
    clearSavedInfo: 'Borrar información guardada después de reservar',

    // Confirmation stage
    confirmTitle: 'Confirma tu Reserva',
    bookingDetails: 'Detalles de la Reserva',
    class: 'Clase',
    instructor: 'Instructor',
    location: 'Ubicación',
    registrationType: 'Tipo de Registro',
    frameSize: 'Tamaño del Bastidor',
    email: 'Correo',
    name: 'Nombre',
    intensive: 'Intensivo',
    recurrent: 'Recurrente',
    standard: 'Estándar',

    // Payment warnings
    paymentDeadline: 'El pago debe completarse dentro de {{hours}} horas para asegurar tu lugar',
    paymentDeadlineDays: 'El pago debe completarse dentro de {{days}} días para asegurar tu lugar',
    paymentDeadlineUrgent: 'El pago debe completarse dentro de {{hours}} horas para asegurar tu lugar',
    reservationCancellation: 'Tu reserva será cancelada automáticamente si no se recibe el pago antes del plazo.',
    creditUsage: 'Esta reserva usará 1 crédito de tu paquete seleccionado',
    accountCreation: 'Crearemos una cuenta para ti y enviaremos instrucciones de activación a tu correo',

    // Error messages
    missingEmail: 'Por favor ingresa tu correo electrónico',
    invalidEmail: 'Por favor ingresa un correo electrónico válido',
    missingFields: 'Por favor completa todos los campos requeridos',
    noFrameAvailable: 'No hay bastidores {{size}} disponibles. Por favor elige otro tamaño.',
    selectRegistrationType: 'Por favor selecciona un tipo de registro',
    checkInfoFailed: 'Error al verificar tu información. Por favor intenta de nuevo.',
    bookingFailed: 'Error al reservar la clase',
    alreadyRegistered: 'Ya tienes una reserva para esta clase',

    // Success messages
    bookingConfirmed: '¡Reserva Confirmada!',
    reservationId: 'Tu ID de reserva es',
    checkEmail: '✉️ Revisa tu correo para los detalles de confirmación',
    arriveEarly: '⏰ Por favor llega 10 minutos antes',
    activateAccount: '🔗 Activa tu cuenta usando el enlace en tu correo',
    redirecting: 'Redirigiendo a la página de confirmación...',

    // Class details
    classDetails: 'Detalles de la Clase',
    date: 'Fecha',
    time: 'Hora',
    yourInformation: 'Tu Información',

    // Frame size info
    intensiveFrameInfo: 'Los cursos intensivos usan solo tamaño PEQUEÑO',

    // TBA
    tba: 'Por confirmar',

    // Classes page
    classSchedule: 'Horario de Clases',
    bookClassesAtEme: 'Reservá clases en EME Estudio - No necesitás cuenta',
    refresh: 'Actualizar',
    alreadyHaveAccount: '¿Ya tenés una cuenta?',
    filters: 'Filtros',
    classType: 'Tipo de Clase',
    allTypes: 'Todos los tipos',
    allInstructors: 'Todos los instructores',
    weeksAhead: 'Semanas por Delante',
    weeks: 'semanas',
    clearFilters: 'Limpiar Filtros',
    noClassesFound: 'No se encontraron clases para los criterios seleccionados.',
    noClasses: 'Sin clases',
    tuftingGunAvailability: 'Disponibilidad de Pistola de Tufting:',
    small: 'Pequeño',
    medium: 'Mediano',
    large: 'Grande',
    bookClass: 'Reservar Clase',
    classFull: 'Clase Completa',
    on: 'el',
    at: 'a las'
  }
}

export const t = (key: string, replacements?: Record<string, any>): string => {
  const keys = key.split('.')
  let value: any = translations.es

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key // Return key if translation not found
    }
  }

  if (typeof value !== 'string') {
    return key
  }

  // Replace placeholders
  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      value = value.replace(`{{${placeholder}}}`, String(replacement))
    })
  }

  return value
}