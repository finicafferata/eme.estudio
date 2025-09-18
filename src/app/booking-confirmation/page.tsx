'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  Mail,
  AlertCircle,
  ArrowLeft,
  Share2,
  Download,
  RefreshCw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ReservationDetails {
  id: string
  uuid: string
  status: string
  class: {
    id: string
    name: string
    startsAt: string
    endsAt: string
    location: {
      name: string
      address: string
    }
    instructor: {
      name: string
    } | null
  }
  user: {
    firstName: string
    lastName: string
    email: string
    needsActivation: boolean
  }
  frameSize: string
  payment: {
    amount: number
    currency: string
    method: string
    status: string
  }
  credits: {
    totalAvailable: number
    packages: Array<{
      id: string
      name: string
      totalCredits: number
      usedCredits: number
      remainingCredits: number
      expiresAt: string | null
    }>
    nextExpiration: string | null
    hasPackages: boolean
  }
  nextSteps: {
    checkEmail: boolean
    arriveEarly: boolean
    activateAccount: boolean
  }
}

export default function BookingConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reservationId = searchParams.get('reservation')

  const [reservation, setReservation] = useState<ReservationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReservationDetails = async () => {
    if (!reservationId) {
      setError('No reservation ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/public/reservation/${reservationId}`)
      if (!response.ok) {
        throw new Error('Failed to load reservation details')
      }

      const data = await response.json()
      setReservation(data)

    } catch (error) {
      console.error('Error loading reservation:', error)
      setError(error instanceof Error ? error.message : 'Failed to load reservation details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReservationDetails()
  }, [reservationId])

  const handleShare = async () => {
    if (!reservation) return

    const shareData = {
      title: `Class Booked: ${reservation.class.name}`,
      text: `I've booked a class at EME Estudio! ${reservation.class.name} on ${format(parseISO(reservation.class.startsAt), 'EEEE, MMMM do')} at ${format(parseISO(reservation.class.startsAt), 'HH:mm')}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.log('Share canceled')
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`)
        alert('Booking details copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy to clipboard')
      }
    }
  }

  const formatPaymentMethod = (method: string) => {
    const methodLabels: Record<string, string> = {
      CASH_PESOS: 'Cash (Pesos)',
      CASH_USD: 'Cash (USD)',
      TRANSFER_TO_MERI_PESOS: 'Transfer to Meri (Pesos)',
      TRANSFER_TO_MALE_PESOS: 'Transfer to Male (Pesos)',
      TRANSFER_IN_USD: 'Transfer (USD)'
    }
    return methodLabels[method] || method
  }

  const formatFrameSize = (size: string) => {
    return size.charAt(0) + size.slice(1).toLowerCase()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Reservation Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'The reservation you\'re looking for could not be found.'}
            </p>
            <div className="space-x-4">
              <Button onClick={() => router.push('/classes')}>
                View Classes
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/classes')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Success Header */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Your class has been successfully booked
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Reservation: {reservation.uuid}
          </Badge>
        </CardContent>
      </Card>

      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {/* Class Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Class Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{reservation.class.name}</h3>
              <div className="space-y-2 mt-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  {format(parseISO(reservation.class.startsAt), 'EEEE, MMMM do, yyyy')}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  {format(parseISO(reservation.class.startsAt), 'HH:mm')} - {format(parseISO(reservation.class.endsAt), 'HH:mm')}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {reservation.class.location.name}
                  {reservation.class.location.address && (
                    <span className="ml-1">- {reservation.class.location.address}</span>
                  )}
                </div>
                {reservation.class.instructor && (
                  <div className="flex items-center text-muted-foreground">
                    <User className="mr-2 h-4 w-4" />
                    {reservation.class.instructor.name}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Frame Size:</span>
                  <div className="font-medium">{formatFrameSize(reservation.frameSize)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="font-medium text-green-600">{reservation.status}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits & Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Credits & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Credit Balance</h4>
              {reservation.credits.hasPackages ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Available Credits:</span>
                    <span className="font-bold text-lg text-green-600">{reservation.credits.totalAvailable}</span>
                  </div>

                  {reservation.credits.packages.map((pkg) => (
                    <div key={pkg.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{pkg.name}</span>
                        <span className="text-sm font-medium">{pkg.remainingCredits}/{pkg.totalCredits}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(pkg.remainingCredits / pkg.totalCredits) * 100}%` }}
                        ></div>
                      </div>
                      {pkg.expiresAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Expires: {format(parseISO(pkg.expiresAt), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  ))}

                  {reservation.credits.nextExpiration && (
                    <div className="text-xs text-orange-600">
                      ⚠️ Next expiration: {format(parseISO(reservation.credits.nextExpiration), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted-foreground mb-2">No active packages</div>
                  <div className="text-sm">This booking was paid per class</div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/packages')}>
                    Purchase Package
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Contact Information</h4>
              <div className="space-y-1 text-sm">
                <div>{reservation.user.firstName} {reservation.user.lastName}</div>
                <div className="text-muted-foreground">{reservation.user.email}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {reservation.nextSteps.checkEmail && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Check Your Email</strong><br />
                  We've sent confirmation details and class information to your email.
                </AlertDescription>
              </Alert>
            )}

            {reservation.nextSteps.arriveEarly && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Arrive 10 Minutes Early</strong><br />
                  Please arrive at least 10 minutes before class starts for check-in.
                </AlertDescription>
              </Alert>
            )}

            {reservation.nextSteps.activateAccount && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Activate Your Account</strong><br />
                  Check your email for an activation link to set up your full account.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="max-w-4xl mx-auto flex justify-center space-x-4">
        <Button onClick={() => router.push('/classes')}>
          Book Another Class
        </Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          Go to Homepage
        </Button>
        {reservation.user.needsActivation && (
          <Button variant="outline" onClick={() => router.push('/login')}>
            Login to Account
          </Button>
        )}
      </div>

      {/* Studio Contact Info */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <p className="mb-2">Questions about your booking?</p>
          <p>Contact EME Estudio: info@emeestudio.com | +1 (555) 123-4567</p>
          <p className="mt-2">Follow us on social media for updates and announcements</p>
        </CardContent>
      </Card>
    </div>
  )
}