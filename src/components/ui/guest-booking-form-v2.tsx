'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  CheckCircle,
  AlertCircle,
  Mail,
  User,
  Loader2,
  Info,
  Clock,
  CreditCard,
  Package,
  AlertTriangle
} from 'lucide-react'
import { FrameSize, RegistrationType } from '@prisma/client'
import { saveGuestData, getGuestFormData, clearGuestData } from '@/lib/guestStorage'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/translations'

interface ClassData {
  id: string
  classType: {
    name: string
  }
  instructor: {
    name: string
  } | null
  location: {
    name: string
    address: string
  }
  startsAt: string
  endsAt: string
  price: number
  frameAvailability: {
    small: {
      capacity: number
      booked: number
      available: number
    }
    medium: {
      capacity: number
      booked: number
      available: number
    }
    large: {
      capacity: number
      booked: number
      available: number
    }
  }
}

interface GuestBookingFormProps {
  classData: ClassData
  onSuccess: (bookingData: any) => void
  onCancel: () => void
}

interface UserPackageInfo {
  userExists: boolean
  user?: {
    firstName: string
    lastName: string
    hasActivePackages: boolean
  }
  packages?: Array<{
    id: string
    name: string
    remainingCredits: number
    expiresAt: string | null
    type: 'intensive' | 'recurrent'
  }>
  registrationOptions?: {
    intensive: {
      available: boolean
      hasPackage: boolean
      frameSize: string
      requiresPayment: boolean
      paymentDeadlineHours: number
      suggestedPackages: any[]
    }
    recurrent: {
      available: boolean
      hasPackage: boolean
      frameSizes: string[]
      requiresPayment: boolean
      paymentDeadlineHours: number
      suggestedPackages: any[]
    }
  }
}

export default function GuestBookingFormV2({ classData, onSuccess, onCancel }: GuestBookingFormProps) {
  const router = useRouter()

  // Form stages
  const [stage, setStage] = useState<'email' | 'registration' | 'details' | 'confirm'>('email')

  // Form data
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null)
  const [frameSize, setFrameSize] = useState<FrameSize>('MEDIUM')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [error, setError] = useState('')
  const [userPackageInfo, setUserPackageInfo] = useState<UserPackageInfo | null>(null)
  const [saveToStorage, setSaveToStorage] = useState(true)
  const [clearStorageData, setClearStorageData] = useState(false)

  // Load saved guest data on component mount
  useEffect(() => {
    const savedData = getGuestFormData()
    if (savedData) {
      setEmail(savedData.email)
      setFirstName(savedData.firstName)
      setLastName(savedData.lastName)
    }
  }, [])

  // Auto-select package when registration type changes
  useEffect(() => {
    if (!userPackageInfo?.registrationOptions || !registrationType) return

    // Clear previous selection when changing registration type
    setSelectedPackageId(null)

    // Auto-select first available package for the selected registration type
    if (registrationType === 'INTENSIVE') {
      const intensivePackages = userPackageInfo.registrationOptions.intensive.suggestedPackages
      if (intensivePackages && intensivePackages.length > 0) {
        setSelectedPackageId(intensivePackages[0].id)
      }
    } else if (registrationType === 'RECURRENT') {
      const recurrentPackages = userPackageInfo.registrationOptions.recurrent.suggestedPackages
      if (recurrentPackages && recurrentPackages.length > 0) {
        setSelectedPackageId(recurrentPackages[0].id)
      }
    }
  }, [registrationType, userPackageInfo])

  // Check user packages when email is entered
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError(t('missingEmail'))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('invalidEmail'))
      return
    }

    setCheckingEmail(true)
    setError('')

    try {
      const response = await fetch('/api/public/check-user-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          classId: classData.id
        })
      })

      if (!response.ok) {
        throw new Error(t('checkInfoFailed'))
      }

      const data = await response.json()
      setUserPackageInfo(data)

      // Check if user already has a reservation for this class
      if (data.hasExistingReservation) {
        setError(t('alreadyRegistered') || 'Ya tienes una reserva para esta clase')
        return
      }

      // Pre-fill user data if exists
      if (data.userExists && data.user) {
        setFirstName(data.user.firstName)
        setLastName(data.user.lastName)
      }

      // Auto-select registration type based on user history or packages
      if (data.autoSelectType && data.preferredType) {
        // User has a consistent registration type history
        setRegistrationType(data.preferredType)

        if (data.preferredType === 'INTENSIVE') {
          setFrameSize('SMALL') // Force SMALL for intensive
          if (data.registrationOptions.intensive.suggestedPackages.length > 0) {
            setSelectedPackageId(data.registrationOptions.intensive.suggestedPackages[0].id)
          }
        } else if (data.preferredType === 'RECURRENT') {
          if (data.registrationOptions.recurrent.suggestedPackages.length > 0) {
            setSelectedPackageId(data.registrationOptions.recurrent.suggestedPackages[0].id)
          }
        }

        // Skip registration type selection and go directly to details
        setStage('details')
      } else if (data.registrationOptions) {
        // Check if user has only one type of package
        const hasIntensive = data.registrationOptions.intensive.hasPackage
        const hasRecurrent = data.registrationOptions.recurrent.hasPackage

        if (hasIntensive && !hasRecurrent) {
          setRegistrationType('INTENSIVE')
          setFrameSize('SMALL') // Force SMALL for intensive
          if (data.registrationOptions.intensive.suggestedPackages.length > 0) {
            setSelectedPackageId(data.registrationOptions.intensive.suggestedPackages[0].id)
          }
          // Skip to details if they only have one type
          setStage('details')
        } else if (!hasIntensive && hasRecurrent) {
          setRegistrationType('RECURRENT')
          if (data.registrationOptions.recurrent.suggestedPackages.length > 0) {
            setSelectedPackageId(data.registrationOptions.recurrent.suggestedPackages[0].id)
          }
          // Skip to details if they only have one type
          setStage('details')
        } else {
          // User has mixed history or no clear preference, show selection
          setStage('registration')
        }
      } else {
        setStage('registration')
      }
    } catch (error) {
      console.error('Error checking user packages:', error)
      setError(t('checkInfoFailed'))
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleRegistrationTypeSelect = () => {
    if (!registrationType) {
      setError(t('selectRegistrationType'))
      return
    }

    // Auto-set frame size for intensive
    if (registrationType === 'INTENSIVE') {
      setFrameSize('SMALL')
    }

    setStage('details')
    setError('')
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName || !lastName) {
      setError(t('missingFields'))
      return
    }

    // Check frame availability
    const frameKey = frameSize.toLowerCase() as 'small' | 'medium' | 'large'
    const frameAvailable = classData.frameAvailability[frameKey].available

    if (frameAvailable <= 0) {
      setError(t('noFrameAvailable', { size: frameSize.toLowerCase() }))
      return
    }

    setStage('confirm')
    setError('')
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Calculate payment deadline
      const classDate = new Date(classData.startsAt)
      const now = new Date()
      const twentyFourHoursBefore = new Date(classDate.getTime() - 24 * 60 * 60 * 1000)

      // If booking within 24 hours of class, set deadline to 30 minutes from now
      // Otherwise, set to 24 hours before class
      const paymentDeadline = twentyFourHoursBefore < now
        ? new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
        : twentyFourHoursBefore

      const response = await fetch('/api/public/book-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          frameSize,
          registrationType,
          packageId: selectedPackageId,
          paymentDeadline: paymentDeadline.toISOString(),
          paymentMethod: 'CASH_USD'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle duplicate registration error specifically
        if (result.error && result.error.includes('already have a reservation')) {
          throw new Error(t('alreadyRegistered') || 'Ya tienes una reserva para esta clase')
        }
        throw new Error(result.error || t('bookingFailed'))
      }

      // Handle localStorage
      if (clearStorageData) {
        clearGuestData()
      } else if (saveToStorage) {
        saveGuestData({
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      }

      // Call success callback
      onSuccess(result)

      // Redirect to confirmation page
      router.push(`/booking-confirmation?reservation=${result.reservation.uuid}`)

    } catch (error) {
      console.error('Booking error:', error)
      setError(error instanceof Error ? error.message : t('bookingFailed'))
    } finally {
      setLoading(false)
    }
  }

  const getPaymentWarningMessage = (warning: any) => {
    if (warning.type === 'urgent') {
      const hoursLeft = Math.floor((new Date(classData.startsAt).getTime() - 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60))
      return t('paymentDeadlineUrgent', { hours: hoursLeft })
    } else {
      const hoursLeft = Math.floor((new Date(classData.startsAt).getTime() - 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60))
      if (hoursLeft > 48) {
        return t('paymentDeadlineDays', { days: Math.floor(hoursLeft / 24) })
      }
      return t('paymentDeadline', { hours: hoursLeft })
    }
  }

  const getPaymentWarning = () => {
    const classDate = new Date(classData.startsAt)
    const paymentDeadline = new Date(classDate.getTime() - 24 * 60 * 60 * 1000)
    const now = new Date()
    const hoursUntilDeadline = Math.floor((paymentDeadline.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (hoursUntilDeadline < 48) {
      return {
        type: 'urgent',
        message: `Payment must be completed within ${hoursUntilDeadline} hours to secure your spot`
      }
    }

    return {
      type: 'normal',
      message: 'Payment must be completed 24 hours before class to secure your spot'
    }
  }

  // Render different stages
  if (stage === 'email') {
    return (
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{t('emailTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('emailSubtitle')}
          </p>
        </div>

        {error && (
          <Alert variant={error.includes('Ya tienes una reserva') ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes('Ya tienes una reserva') && (
                <div className="mt-2 text-sm">
                  <p>Puedes ver y gestionar tus reservas existentes iniciando sesión en tu cuenta.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open('/login', '_blank')}
                  >
                    Iniciar Sesión
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            disabled={checkingEmail}
            className="mt-1"
          />
        </div>

        <div className="flex space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={checkingEmail}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={checkingEmail} className="flex-1">
            {checkingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('checking')}
              </>
            ) : (
              t('continue')
            )}
          </Button>
        </div>
      </form>
    )
  }

  if (stage === 'registration') {
    const options = userPackageInfo?.registrationOptions

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{t('registrationTitle')}</h3>
          {userPackageInfo?.userExists && (
            <p className="text-sm text-muted-foreground">
              {t('welcomeBack')}, {userPackageInfo.user?.firstName}!
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {userPackageInfo?.packages && userPackageInfo.packages.length > 0 && (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              {t('activePackages', { count: userPackageInfo.packages.length })}
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup value={registrationType || ''} onValueChange={(value) => setRegistrationType(value as RegistrationType)}>
          <div className="space-y-3">
            {/* Intensive Option */}
            <Card className={registrationType === 'INTENSIVE' ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INTENSIVE" id="intensive" />
                  <Label htmlFor="intensive" className="font-medium cursor-pointer">
                    {t('intensiveCourse')}
                  </Label>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <p>• {t('frameSizeSmallOnly')}</p>
                  {options?.intensive.hasPackage ? (
                    <p className="text-green-600">{t('hasPackageIntensive')}</p>
                  ) : (
                    <p className="text-orange-600">{t('paymentRequired')}</p>
                  )}
                </div>
                {options?.intensive.suggestedPackages && options.intensive.suggestedPackages.length > 0 && (
                  <Select value={selectedPackageId || ''} onValueChange={setSelectedPackageId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectPackage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.intensive.suggestedPackages.map((pkg: any) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({t('creditsRemaining', { credits: pkg.remainingCredits })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Recurrent Option */}
            <Card className={registrationType === 'RECURRENT' ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="RECURRENT" id="recurrent" />
                  <Label htmlFor="recurrent" className="font-medium cursor-pointer">
                    {t('recurrentCourse')}
                  </Label>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <p>• {t('frameSizeChoose')}</p>
                  {options?.recurrent.hasPackage ? (
                    <p className="text-green-600">{t('hasPackageRecurrent')}</p>
                  ) : (
                    <p className="text-orange-600">{t('paymentRequired')}</p>
                  )}
                </div>
                {options?.recurrent.suggestedPackages && options.recurrent.suggestedPackages.length > 0 && (
                  <Select value={selectedPackageId || ''} onValueChange={setSelectedPackageId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectPackage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.recurrent.suggestedPackages.map((pkg: any) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({t('creditsRemaining', { credits: pkg.remainingCredits })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </div>
        </RadioGroup>

        <div className="flex space-x-3">
          <Button type="button" variant="outline" onClick={() => setStage('email')}>
            {t('back')}
          </Button>
          <Button onClick={handleRegistrationTypeSelect} disabled={!registrationType} className="flex-1">
            {t('continue')}
          </Button>
        </div>
      </div>
    )
  }

  if (stage === 'details') {
    const frameSizeLabels: Record<FrameSize, string> = {
      SMALL: t('smallFrame'),
      MEDIUM: t('mediumFrame'),
      LARGE: t('largeFrame')
    }

    const getFrameAvailabilityInfo = (fs: FrameSize) => {
      const frameKey = fs.toLowerCase() as 'small' | 'medium' | 'large'
      const frameData = classData.frameAvailability[frameKey]
      return {
        available: frameData.available,
        capacity: frameData.capacity,
        isAvailable: frameData.available > 0
      }
    }

    return (
      <form onSubmit={handleDetailsSubmit} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{t('detailsTitle')}</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {registrationType === 'INTENSIVE' ? t('intensiveCourse') : t('recurrentCourse')}
            </p>
            {(userPackageInfo as any)?.autoSelectType && (
              <Badge variant="secondary" className="text-xs">
                {t('yourUsualType')}
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!userPackageInfo?.userExists && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">{t('firstName')} *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('firstNamePlaceholder')}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="lastName">{t('lastName')} *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('lastNamePlaceholder')}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Frame Size Selection */}
        <div>
          <Label htmlFor="frameSize">{t('frameSizeLabel')}</Label>
          {registrationType === 'INTENSIVE' ? (
            <div className="mt-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t('intensiveFrameInfo')}
                </AlertDescription>
              </Alert>
              <Input
                value={t('smallFrame')}
                disabled
                className="mt-2"
              />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <Select value={frameSize} onValueChange={(value) => setFrameSize(value as FrameSize)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frameSizeLabels).map(([value, label]) => {
                    const fs = value as FrameSize
                    const info = getFrameAvailabilityInfo(fs)
                    return (
                      <SelectItem
                        key={value}
                        value={value}
                        disabled={!info.isAvailable}
                      >
                        {label} - {info.available}/{info.capacity} available
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Storage Options */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveToStorage"
              checked={saveToStorage}
              onCheckedChange={(checked) => setSaveToStorage(checked === true)}
            />
            <Label htmlFor="saveToStorage" className="text-sm">
              {t('rememberInfo')}
            </Label>
          </div>

          {getGuestFormData() && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearStorage"
                checked={clearStorageData}
                onCheckedChange={(checked) => setClearStorageData(checked === true)}
              />
              <Label htmlFor="clearStorage" className="text-sm">
                {t('clearSavedInfo')}
              </Label>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <Button type="button" variant="outline" onClick={() => {
            // If auto-selected, allow changing the type
            if ((userPackageInfo as any)?.autoSelectType) {
              setStage('registration')
            } else {
              setStage('email')
            }
          }}>
            {(userPackageInfo as any)?.autoSelectType ? t('changeType') : t('back')}
          </Button>
          <Button type="submit" className="flex-1">
            {t('reviewBooking')}
          </Button>
        </div>
      </form>
    )
  }

  if (stage === 'confirm') {
    const needsPayment = !selectedPackageId
    const paymentWarning = getPaymentWarning()

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{t('confirmTitle')}</h3>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('bookingDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('class')}:</span>
              <span>{classData.classType.name}</span>

              <span className="text-muted-foreground">{t('instructor')}:</span>
              <span>{classData.instructor?.name || t('tba')}</span>

              <span className="text-muted-foreground">{t('location')}:</span>
              <span>{classData.location.name}</span>

              <span className="text-muted-foreground">{t('registrationType')}:</span>
              <span>{registrationType === 'INTENSIVE' ? t('intensive') : t('recurrent')}</span>

              <span className="text-muted-foreground">{t('frameSize')}:</span>
              <span>{frameSize}</span>

              <span className="text-muted-foreground">{t('email')}:</span>
              <span>{email}</span>

              <span className="text-muted-foreground">{t('name')}:</span>
              <span>{firstName} {lastName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Warning */}
        {needsPayment && (
          <Alert variant={paymentWarning.type === 'urgent' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">{getPaymentWarningMessage(paymentWarning)}</div>
                <div className="text-xs">
                  {t('reservationCancellation')}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {selectedPackageId && (
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              {t('creditUsage')}
            </AlertDescription>
          </Alert>
        )}

        {!userPackageInfo?.userExists && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {t('accountCreation')}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex space-x-3">
          <Button type="button" variant="outline" onClick={() => setStage('details')} disabled={loading}>
            {t('back')}
          </Button>
          <Button onClick={handleFinalSubmit} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('booking')}
              </>
            ) : (
              t('confirmBooking')
            )}
          </Button>
        </div>
      </div>
    )
  }

  return null
}