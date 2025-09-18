// Email service for EME Estudio
// This is a placeholder implementation - in production you'd integrate with
// services like SendGrid, AWS SES, Nodemailer, etc.

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

// Production email service (placeholder)
class ProductionEmailService implements EmailService {
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    try {
      // Example with SendGrid or similar service
      // const sgMail = require('@sendgrid/mail')
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY)

      // const msg = {
      //   to: data.studentEmail,
      //   from: 'noreply@emeestudio.com',
      //   subject: `Class Booking Confirmed - ${data.className}`,
      //   html: this.generateHTMLEmail(data)
      // }

      // await sgMail.send(msg)

      // For now, use the mock service
      return new MockEmailService().sendBookingConfirmation(data)

    } catch (error) {
      console.error('Email sending failed:', error)
      return false
    }
  }

  async sendPackageExpirationWarning(data: PackageExpirationWarningData): Promise<boolean> {
    // For now, delegate to mock service
    return new MockEmailService().sendPackageExpirationWarning(data)
  }

  async sendPackageExpiredNotification(data: PackageExpiredData): Promise<boolean> {
    // For now, delegate to mock service
    return new MockEmailService().sendPackageExpiredNotification(data)
  }

  private generateHTMLEmail(data: BookingConfirmationData): string {
    // HTML email template would go here
    return new MockEmailService()['generateEmailContent'](data)
  }
}

// Export the email service instance
export const emailService: EmailService = process.env.NODE_ENV === 'production'
  ? new ProductionEmailService()
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
    duration: reservation.class.classType.durationMinutes
  }
}