// Email service for EME Estudio
// Integrated with Resend API for production email sending

import { Resend } from 'resend'

export interface BookingConfirmationData {
  studentName: string
  studentEmail: string
  className: string
  classDate: string
  classTime: string
  classEndTime: string
  instructor: string | null
  location: string
  locationAddress: string
  packageName?: string
  confirmationId: string
  duration: number
}

export interface PackageExpirationWarningData {
  email: string
  name: string
  packageName: string
  daysUntilExpiry: number
  unusedCredits: number
  expirationDate: string
}

export interface PackageExpiredData {
  email: string
  name: string
  packageName: string
  unusedCredits: number
  expiredDate: string
}

export interface EmailService {
  sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean>
  sendPackageExpirationWarning(data: PackageExpirationWarningData): Promise<boolean>
  sendPackageExpiredNotification(data: PackageExpiredData): Promise<boolean>
}

// Mock email service for development
class MockEmailService implements EmailService {
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    // In development, we'll just log the email content
    console.log('📧 Email Confirmation Sent:', {
      to: data.studentEmail,
      subject: `Class Booking Confirmed - ${data.className}`,
      content: this.generateEmailContent(data)
    })

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // In production, replace this with actual email sending logic
    return true
  }

  async sendPackageExpirationWarning(data: PackageExpirationWarningData): Promise<boolean> {
    console.log('⚠️ Package Expiration Warning Email Sent:', {
      to: data.email,
      subject: `Your ${data.packageName} package expires in ${data.daysUntilExpiry} days`,
      content: this.generateExpirationWarningContent(data)
    })

    await new Promise(resolve => setTimeout(resolve, 500))
    return true
  }

  async sendPackageExpiredNotification(data: PackageExpiredData): Promise<boolean> {
    console.log('📮 Package Expired Notification Email Sent:', {
      to: data.email,
      subject: `Your ${data.packageName} package has expired`,
      content: this.generateExpiredNotificationContent(data)
    })

    await new Promise(resolve => setTimeout(resolve, 500))
    return true
  }

  private generateEmailContent(data: BookingConfirmationData): string {
    return `
      Hello ${data.studentName},

      Your class booking has been confirmed!

      📅 Class Details:
      • Class: ${data.className}
      • Date: ${data.classDate}
      • Time: ${data.classTime} - ${data.classEndTime}
      • Duration: ${data.duration} minutes
      • Instructor: ${data.instructor || 'TBA'}
      • Location: ${data.location}
      • Address: ${data.locationAddress}

      💳 Payment Information:
      ${data.packageName ? `• Package: ${data.packageName}` : '• Paid individually'}

      🆔 Confirmation ID: ${data.confirmationId}

      📍 Important Information:
      • Please arrive 10 minutes before your class starts
      • Bring comfortable clothes for your tufting session
      • All materials will be provided

      If you need to cancel or reschedule, please do so at least 24 hours in advance.

      Questions? Contact us at info@emeestudio.com

      See you in class!
      EME Estudio Team
    `
  }

  private generateExpirationWarningContent(data: PackageExpirationWarningData): string {
    return `
      Hello ${data.name},

      ⚠️ Package Expiration Reminder

      Your "${data.packageName}" package is expiring soon:

      📅 Expiration Details:
      • Expires in: ${data.daysUntilExpiry} day${data.daysUntilExpiry !== 1 ? 's' : ''}
      • Expiration date: ${new Date(data.expirationDate).toLocaleDateString()}
      • Unused credits: ${data.unusedCredits}

      🚨 Important:
      After expiration, you won't be able to use the remaining ${data.unusedCredits} credit${data.unusedCredits !== 1 ? 's' : ''} in this package.

      📞 Need help?
      Contact us to discuss your options or to book your remaining classes.

      📧 Email: info@emeestudio.com
      📱 Phone: [Your phone number]

      Thanks,
      EME Estudio Team
    `
  }

  private generateExpiredNotificationContent(data: PackageExpiredData): string {
    return `
      Hello ${data.name},

      📮 Package Expiration Notice

      Your "${data.packageName}" package has expired as of ${new Date(data.expiredDate).toLocaleDateString()}.

      📊 Summary:
      • Package: ${data.packageName}
      • Expired: ${new Date(data.expiredDate).toLocaleDateString()}
      • Unused credits: ${data.unusedCredits}

      ${data.unusedCredits > 0 ? `
      💡 What's next?
      You had ${data.unusedCredits} unused credit${data.unusedCredits !== 1 ? 's' : ''} in this package. Please contact us to discuss:
      • Purchasing a new package
      • Special arrangements for unused credits
      ` : `
      Thank you for using your package to its fullest!
      `}

      📞 Contact us:
      📧 Email: info@emeestudio.com
      📱 Phone: [Your phone number]

      We'd love to help you continue your tufting journey with a new package!

      Thanks,
      EME Estudio Team
    `
  }
}

// Resend email service for production
class ResendEmailService implements EmailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, using mock service')
        return new MockEmailService().sendBookingConfirmation(data)
      }

      const result = await this.resend.emails.send({
        from: 'EME Estudio <noreply@emeestudio.com>',
        to: [data.studentEmail],
        subject: `¡Reserva Confirmada! - ${data.className}`,
        html: this.generateHTMLEmail(data)
      })

      console.log('📧 Email sent via Resend:', result.data?.id)
      return true

    } catch (error) {
      console.error('Email sending failed:', error)
      // Fallback to mock service for development
      return new MockEmailService().sendBookingConfirmation(data)
    }
  }

  async sendPackageExpirationWarning(data: PackageExpirationWarningData): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return new MockEmailService().sendPackageExpirationWarning(data)
      }

      await this.resend.emails.send({
        from: 'EME Estudio <noreply@emeestudio.com>',
        to: [data.email],
        subject: `⚠️ Tu paquete ${data.packageName} expira en ${data.daysUntilExpiry} días`,
        html: this.generateExpirationWarningHTML(data)
      })

      return true
    } catch (error) {
      console.error('Package expiration warning email failed:', error)
      return new MockEmailService().sendPackageExpirationWarning(data)
    }
  }

  async sendPackageExpiredNotification(data: PackageExpiredData): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return new MockEmailService().sendPackageExpiredNotification(data)
      }

      await this.resend.emails.send({
        from: 'EME Estudio <noreply@emeestudio.com>',
        to: [data.email],
        subject: `📮 Tu paquete ${data.packageName} ha expirado`,
        html: this.generateExpiredNotificationHTML(data)
      })

      return true
    } catch (error) {
      console.error('Package expired notification email failed:', error)
      return new MockEmailService().sendPackageExpiredNotification(data)
    }
  }

  private generateHTMLEmail(data: BookingConfirmationData): string {
    const logoUrl = 'https://your-domain.com/logo.png' // Update with your logo URL

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Reserva - EME Estudio</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 150px; height: auto; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { font-weight: bold; color: #e74c3c; }
        .value { color: #333; }
        .confirmation-id { background: #e74c3c; color: white; padding: 10px; text-align: center; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
        .important { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        @media only screen and (max-width: 600px) {
          .detail-row { flex-direction: column; }
          .detail-row .value { margin-top: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="EME Estudio" class="logo">
        <h1>¡Reserva Confirmada!</h1>
      </div>

      <div class="content">
        <p>Hola <strong>${data.studentName}</strong>,</p>
        <p>Tu reserva de clase ha sido confirmada exitosamente. ¡Estamos emocionados de verte en el estudio!</p>

        <div class="details">
          <h3>📅 Detalles de tu Clase</h3>
          <div class="detail-row">
            <span class="label">Clase:</span>
            <span class="value">${data.className}</span>
          </div>
          <div class="detail-row">
            <span class="label">Fecha:</span>
            <span class="value">${data.classDate}</span>
          </div>
          <div class="detail-row">
            <span class="label">Hora:</span>
            <span class="value">${data.classTime} - ${data.classEndTime}</span>
          </div>
          <div class="detail-row">
            <span class="label">Duración:</span>
            <span class="value">${data.duration} minutos</span>
          </div>
          <div class="detail-row">
            <span class="label">Instructor:</span>
            <span class="value">${data.instructor || 'Por confirmar'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Ubicación:</span>
            <span class="value">${data.location}</span>
          </div>
          <div class="detail-row">
            <span class="label">Dirección:</span>
            <span class="value">${data.locationAddress}</span>
          </div>
          ${data.packageName ? `
          <div class="detail-row">
            <span class="label">Paquete:</span>
            <span class="value">${data.packageName}</span>
          </div>
          ` : ''}
        </div>

        <div class="confirmation-id">
          🆔 ID de Confirmación: ${data.confirmationId}
        </div>

        <div class="important">
          <h4>📍 Información Importante:</h4>
          <ul>
            <li>Por favor llega <strong>10 minutos antes</strong> del inicio de tu clase</li>
            <li>Trae ropa cómoda para tu sesión de tufting</li>
            <li>Todos los materiales serán proporcionados</li>
            <li>Si necesitas cancelar o reprogramar, hazlo con <strong>al menos 24 horas de anticipación</strong></li>
          </ul>
        </div>
      </div>

      <div class="footer">
        <p>¿Tienes preguntas? Contáctanos en <a href="mailto:info@emeestudio.com">info@emeestudio.com</a></p>
        <p>¡Nos vemos en clase!</p>
        <p><strong>Equipo EME Estudio</strong></p>
      </div>
    </body>
    </html>
    `
  }

  private generateExpirationWarningHTML(data: PackageExpirationWarningData): string {
    const logoUrl = 'https://your-domain.com/logo.png' // Update with your logo URL

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Expiración - EME Estudio</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #f39c12; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 150px; height: auto; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="EME Estudio" class="logo">
        <h1>⚠️ Recordatorio de Expiración</h1>
      </div>

      <div class="warning">
        <p>Hola <strong>${data.name}</strong>,</p>
        <p>Tu paquete "<strong>${data.packageName}</strong>" está por expirar:</p>
        <ul>
          <li><strong>Expira en:</strong> ${data.daysUntilExpiry} día${data.daysUntilExpiry !== 1 ? 's' : ''}</li>
          <li><strong>Fecha de expiración:</strong> ${new Date(data.expirationDate).toLocaleDateString('es-ES')}</li>
          <li><strong>Créditos sin usar:</strong> ${data.unusedCredits}</li>
        </ul>
        <p><strong>¡No pierdas tus créditos!</strong> Después de la expiración no podrás usar los ${data.unusedCredits} crédito${data.unusedCredits !== 1 ? 's' : ''} restante${data.unusedCredits !== 1 ? 's' : ''}.</p>
      </div>

      <div class="footer">
        <p>¿Necesitas ayuda? Contáctanos:</p>
        <p>📧 <a href="mailto:info@emeestudio.com">info@emeestudio.com</a></p>
        <p><strong>Equipo EME Estudio</strong></p>
      </div>
    </body>
    </html>
    `
  }

  private generateExpiredNotificationHTML(data: PackageExpiredData): string {
    const logoUrl = 'https://your-domain.com/logo.png' // Update with your logo URL

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paquete Expirado - EME Estudio</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 150px; height: auto; }
        .expired { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="EME Estudio" class="logo">
        <h1>📮 Paquete Expirado</h1>
      </div>

      <div class="expired">
        <p>Hola <strong>${data.name}</strong>,</p>
        <p>Tu paquete "<strong>${data.packageName}</strong>" ha expirado el ${new Date(data.expiredDate).toLocaleDateString('es-ES')}.</p>
        ${data.unusedCredits > 0 ? `
        <p>Tenías <strong>${data.unusedCredits} crédito${data.unusedCredits !== 1 ? 's' : ''} sin usar</strong>. Contáctanos para discutir opciones especiales o adquirir un nuevo paquete.</p>
        ` : `
        <p>¡Felicitaciones por haber usado tu paquete al máximo!</p>
        `}
      </div>

      <div class="footer">
        <p>¿Listo para un nuevo paquete? Contáctanos:</p>
        <p>📧 <a href="mailto:info@emeestudio.com">info@emeestudio.com</a></p>
        <p><strong>Equipo EME Estudio</strong></p>
      </div>
    </body>
    </html>
    `
  }
}

// Export the email service instance
export const emailService: EmailService = process.env.RESEND_API_KEY
  ? new ResendEmailService()
  : new MockEmailService()

// Helper function to format booking data for email
export function formatBookingForEmail(reservation: any): BookingConfirmationData {
  const classStartDate = new Date(reservation.class.startsAt)
  const classEndDate = new Date(reservation.class.endsAt)

  return {
    studentName: `${reservation.user.firstName} ${reservation.user.lastName}`,
    studentEmail: reservation.user.email,
    className: reservation.class.classType.name,
    classDate: classStartDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    classTime: classStartDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    classEndTime: classEndDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    instructor: reservation.class.instructor
      ? `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}`
      : null,
    location: reservation.class.location.name,
    locationAddress: reservation.class.location.address || '',
    packageName: reservation.package?.name,
    confirmationId: reservation.id.toString(),
    duration: reservation.class.classType.durationMinutes || 120
  }
}