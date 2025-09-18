# Email Configuration for EME Estudio

## Overview
The booking system includes automatic email confirmations for students when they book classes. Currently configured with a mock service for development.

## Email Features
- ✅ Booking confirmation emails sent automatically
- ✅ Includes class details, instructor, location, and timing
- ✅ Shows package information and confirmation ID
- ✅ Non-blocking async email sending (doesn't delay booking response)

## Development Mode
Currently using a mock email service that logs email content to console.

## Production Setup

### Option 1: SendGrid (Recommended)
1. Sign up for SendGrid account
2. Get API key from SendGrid dashboard
3. Add to environment variables:
   ```
   SENDGRID_API_KEY=your_api_key_here
   EMAIL_FROM=noreply@emeestudio.com
   ```
4. Update `/src/lib/email.ts` to uncomment SendGrid implementation

### Option 2: AWS SES
1. Set up AWS SES in your region
2. Verify sender email domain
3. Add credentials to environment:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   EMAIL_FROM=noreply@emeestudio.com
   ```

### Option 3: Nodemailer with SMTP
1. Configure SMTP settings:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   EMAIL_FROM=noreply@emeestudio.com
   ```

## Email Template Customization
- HTML templates can be added to `/src/lib/email.ts`
- Include EME Estudio branding and styling
- Add social media links and contact information

## Testing
- Development: Check console logs for email content
- Production: Test with real email addresses before launch

## Future Enhancements
- Email templates with HTML/CSS styling
- Cancellation confirmation emails
- Reminder emails (24 hours before class)
- Instructor notifications
- Waitlist notifications when spots open up