'use client'

import { useState, useEffect, Suspense } from 'react'
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
  AlertTriangle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ReservationDetails {
  id: string
  uuid: string
  status: string
  packageId: string | null
  paymentDeadline: string | null
  usedPackage: {
    id: string
    name: string
    status: string
  } | null
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
  } | null
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
    paymentRequired?: boolean
  }
  paymentInstructions?: {
    packageName: string
    message: string
    contactInfo: string
  } | null
}

function BookingConfirmationContent() {
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

  // Payment status checks
  const hasUsedPackage = () => {
    return reservation?.usedPackage !== null
  }

  const hasPayment = () => {
    return reservation?.payment !== null && reservation?.payment?.status === 'PAID'
  }

  const needsPayment = () => {
    // Needs payment if:
    // 1. No package was used AND
    // 2. No payment exists OR payment is pending
    return !hasUsedPackage() && (!reservation?.payment || reservation?.payment?.status === 'PENDING')
  }

  const getPaymentDeadline = () => {
    if (!reservation || !reservation.paymentDeadline) return null
    return new Date(reservation.paymentDeadline)
  }

  const isUrgentPayment = () => {
    if (!reservation || !reservation.paymentDeadline) return false
    const deadline = new Date(reservation.paymentDeadline)
    const now = new Date()
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilDeadline <= 1 // Payment needed within 1 hour
  }

  const getTimeUntilClass = () => {
    if (!reservation) return null
    const classDate = new Date(reservation.class.startsAt)
    const now = new Date()
    const hoursUntil = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntil
  }

  const formatPaymentMethod = (method: string) => {
    const methodLabels: Record<string, string> = {
      CASH_PESOS: 'Efectivo (Pesos)',
      CASH_USD: 'Efectivo (USD)',
      TRANSFER_TO_MERI_PESOS: 'Transferencia a Meri (Pesos)',
      TRANSFER_TO_MALE_PESOS: 'Transferencia a Male (Pesos)',
      TRANSFER_IN_USD: 'Transferencia (USD)'
    }
    return methodLabels[method] || method
  }

  const formatFrameSize = (size: string) => {
    const sizes: Record<string, string> = {
      'SMALL': 'Pequeño',
      'MEDIUM': 'Mediano',
      'LARGE': 'Grande'
    }
    return sizes[size] || size
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
            <h1 className="text-2xl font-bold mb-2">Reserva No Encontrada</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'No pudimos encontrar la reserva que estás buscando.'}
            </p>
            <div className="space-x-4">
              <Button onClick={() => router.push('/clases')}>
                Ver Clases
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Ir al Inicio
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
          onClick={() => router.push('/clases')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Clases
        </Button>
      </div>

      {/* Success Header */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">¡Reserva Confirmada!</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Tu clase ha sido reservada exitosamente
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Reserva: {reservation.uuid}
          </Badge>
        </CardContent>
      </Card>

      {/* Payment Status Messages */}
      {hasUsedPackage() && reservation?.usedPackage && reservation.usedPackage.status === 'ACTIVE' && (
        <Alert className="max-w-4xl mx-auto border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong className="text-green-800">Clase pagada con tu paquete</strong><br />
            <span className="text-green-700">Usaste un crédito de tu paquete: {reservation.usedPackage.name}</span>
          </AlertDescription>
        </Alert>
      )}

      {hasPayment() && (
        <Alert className="max-w-4xl mx-auto border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong className="text-green-800">Pago registrado</strong><br />
            <span className="text-green-700">Tu pago ha sido confirmado. ¡Te esperamos en la clase!</span>
          </AlertDescription>
        </Alert>
      )}

      {needsPayment() && (
        <Alert
          variant={isUrgentPayment() ? "destructive" : "warning"}
          className={`max-w-4xl mx-auto ${isUrgentPayment() ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}
        >
          <AlertTriangle className={`h-4 w-4 ${isUrgentPayment() ? 'text-red-600' : 'text-yellow-600'}`} />
          <AlertDescription>
            <strong className={isUrgentPayment() ? 'text-red-800' : 'text-yellow-800'}>
              {isUrgentPayment() ? '¡PAGO URGENTE REQUERIDO!' : 'Recordatorio de Pago'}
            </strong><br />
            <span className={isUrgentPayment() ? 'text-red-700' : 'text-yellow-700'}>
              {(() => {
                const hoursUntilClass = getTimeUntilClass()
                const deadline = getPaymentDeadline()

                if (isUrgentPayment()) {
                  if (hoursUntilClass && hoursUntilClass <= 2) {
                    return (
                      <>
                        <strong>Tu clase empieza pronto.</strong> Por favor, realizá el pago inmediatamente para confirmar tu lugar.<br />
                        <strong>Tenés hasta las {deadline ? format(deadline, 'HH:mm') : 'N/A'} hs para pagar.</strong><br />
                        Pasado este tiempo, tu reserva será cancelada automáticamente.
                      </>
                    )
                  }
                }

                return (
                  <>
                    Recordá que tenés que abonar la clase antes del inicio.<br />
                    <strong>Fecha límite de pago:</strong> {deadline ? format(deadline, 'dd/MM/yyyy HH:mm') : 'N/A'} hs.<br />
                    Si no se recibe el pago, tu reserva será cancelada automáticamente.
                  </>
                )
              })()}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Instructions for Packages */}
      {reservation?.paymentInstructions && reservation?.nextSteps?.paymentRequired && (
        <Alert className="max-w-4xl mx-auto border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong className="text-orange-800">Se requiere pago para tu paquete</strong><br />
            <span className="text-orange-700 mb-2 block">{reservation.paymentInstructions.message}</span>
            <div className="text-sm text-orange-700 bg-orange-100 p-2 rounded mt-2">
              <strong>Paquete:</strong> {reservation.paymentInstructions.packageName}<br />
              <strong>¿Cómo pagar?</strong> {reservation.paymentInstructions.contactInfo}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {/* Class Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Detalles de la Clase
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
                  <span className="text-muted-foreground">Tamaño del Bastidor:</span>
                  <div className="font-medium">{formatFrameSize(reservation.frameSize)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <div className="font-medium text-green-600">CONFIRMADO</div>
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
              Créditos y Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Balance de Créditos</h4>
              {reservation.credits.hasPackages ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Créditos Disponibles:</span>
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
                          Vence: {format(parseISO(pkg.expiresAt), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>
                  ))}

                  {reservation.credits.nextExpiration && (
                    <div className="text-xs text-orange-600">
                      ⚠️ Próximo vencimiento: {format(parseISO(reservation.credits.nextExpiration), 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted-foreground mb-2">No tenés paquetes activos</div>
                  <div className="text-sm">
                    {hasUsedPackage() ? 'Esta clase fue pagada con un paquete' :
                     hasPayment() ? 'Esta clase ya fue pagada' :
                     'Esta reserva se debe pagar por clase'}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Información de Contacto</h4>
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
          <CardTitle>¿Qué sigue?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {reservation.nextSteps.checkEmail && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Revisá tu Correo</strong><br />
                  Te enviamos los detalles de confirmación e información de la clase a tu correo.
                </AlertDescription>
              </Alert>
            )}

            {reservation.nextSteps.arriveEarly && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Llegá 10 Minutos Antes</strong><br />
                  Por favor, llegá al menos 10 minutos antes del inicio de la clase para el check-in.
                </AlertDescription>
              </Alert>
            )}

            {reservation.nextSteps.activateAccount && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Activá tu Cuenta</strong><br />
                  Revisá tu correo para encontrar el enlace de activación y configurar tu cuenta completa.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="max-w-4xl mx-auto flex justify-center space-x-4">
        <Button onClick={() => router.push('/clases')}>
          Reservar Otra Clase
        </Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          Ir al Inicio
        </Button>
        {reservation.user.needsActivation && (
          <Button variant="outline" onClick={() => router.push('/login')}>
            Iniciar Sesión
          </Button>
        )}
      </div>

      {/* Studio Contact Info */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <p className="mb-2">¿Tenés preguntas sobre tu reserva?</p>
          <p>EME Estudio - José Penna 989, San Isidro</p>
          <p>info@emeestudio.com | WhatsApp: +54 9 11 1234-5678</p>
          <p className="mt-2">Seguinos en redes sociales para novedades y anuncios</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    }>
      <BookingConfirmationContent />
    </Suspense>
  )
}