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
import { Checkbox } from '@/components/ui/checkbox'
import {
  CheckCircle,
  AlertCircle,
  Mail,
  User,
  Loader2,
  Info
} from 'lucide-react'
import { FrameSize } from '@prisma/client'
import { saveGuestData, getGuestFormData, clearGuestData } from '@/lib/guestStorage'
import { useRouter } from 'next/navigation'

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

export default function GuestBookingForm({ classData, onSuccess, onCancel }: GuestBookingFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    frameSize: 'MEDIUM' as FrameSize
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)
  const [saveToStorage, setSaveToStorage] = useState(true)
  const [clearStorageData, setClearStorageData] = useState(false)

  // Load saved guest data on component mount
  useEffect(() => {
    const savedData = getGuestFormData()
    if (savedData) {
      setFormData(prev => ({
        ...prev,
        email: savedData.email,
        firstName: savedData.firstName,
        lastName: savedData.lastName
      }))
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('') // Clear error when user types
  }

  const validateForm = () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Check if selected frame size is available
    const frameInfo = getFrameAvailabilityInfo(formData.frameSize)
    if (!frameInfo.isAvailable) {
      setError('Selected frame size is no longer available. Please choose a different size.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/public/book-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: classData.id,
          email: formData.email.toLowerCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          frameSize: formData.frameSize,
          paymentMethod: 'CASH_USD' // Default payment method
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to book class')
      }

      // Handle localStorage
      if (clearStorageData) {
        clearGuestData()
      } else if (saveToStorage) {
        saveGuestData({
          email: formData.email.toLowerCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim()
        })
      }

      setBookingResult(result)
      setSuccess(true)

      // Call success callback after a brief delay to show success message
      setTimeout(() => {
        onSuccess(result)
        // Redirect to confirmation page
        router.push(`/booking-confirmation?reservation=${result.reservation.uuid}`)
      }, 2000)

    } catch (error) {
      console.error('Booking error:', error)
      setError(error instanceof Error ? error.message : 'Failed to book class')
    } finally {
      setLoading(false)
    }
  }

  const frameSizeLabels: Record<FrameSize, string> = {
    SMALL: 'Small',
    MEDIUM: 'Medium',
    LARGE: 'Large'
  }

  const getFrameAvailabilityInfo = (frameSize: FrameSize) => {
    const frameKey = frameSize.toLowerCase() as 'small' | 'medium' | 'large'
    const frameData = classData.frameAvailability[frameKey]
    return {
      available: frameData.available,
      capacity: frameData.capacity,
      isAvailable: frameData.available > 0
    }
  }

  const getFrameDisplayText = (frameSize: FrameSize) => {
    const info = getFrameAvailabilityInfo(frameSize)
    const label = frameSizeLabels[frameSize]
    if (!info.isAvailable) {
      return `${label} - Sold Out`
    }
    return `${label} - ${info.available}/${info.capacity} available`
  }

  if (success && bookingResult) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium">Booking Confirmed!</div>
            <div className="mt-1">
              Your reservation ID is: <strong>{bookingResult.reservation.uuid}</strong>
            </div>
          </AlertDescription>
        </Alert>

        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-medium">Booking Details</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div><strong>Class:</strong> {bookingResult.class.name}</div>
            <div><strong>Date & Time:</strong> {new Date(bookingResult.class.startsAt).toLocaleDateString()} at {new Date(bookingResult.class.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Location:</strong> {bookingResult.class.location.name}</div>
            <div><strong>Frame Size:</strong> {frameSizeLabels[bookingResult.frameSize]}</div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div>✉️ Check your email for confirmation details</div>
              <div>⏰ Please arrive 10 minutes early</div>
              {bookingResult.user.needsActivation && (
                <div>🔗 Activate your account using the link in your email</div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-muted-foreground">
          Redirecting to confirmation page...
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Class Summary */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium mb-2">Class Details</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><strong>Class:</strong> {classData.classType.name}</div>
          <div><strong>Instructor:</strong> {classData.instructor?.name || 'TBA'}</div>
          <div><strong>Location:</strong> {classData.location.name}</div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center">
          <User className="mr-2 h-4 w-4" />
          Your Information
        </h4>

        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
            required
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="First name"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Last name"
              required
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Frame Size Selection */}
      <div>
        <Label htmlFor="frameSize">Tufting Gun Size</Label>
        <div className="mt-2 space-y-2">
          <Select value={formData.frameSize} onValueChange={(value) => handleInputChange('frameSize', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(frameSizeLabels).map(([value, label]) => {
                const frameSize = value as FrameSize
                const info = getFrameAvailabilityInfo(frameSize)
                return (
                  <SelectItem
                    key={value}
                    value={value}
                    disabled={!info.isAvailable}
                  >
                    {getFrameDisplayText(frameSize)}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Frame size info */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md">
            <div className="font-medium mb-1">Frame Size Guide:</div>
            <div>• <strong>Small:</strong> 20x20cm - Perfect for beginners and small projects</div>
            <div>• <strong>Medium:</strong> 30x30cm - Most popular size, ideal for wall art</div>
            <div>• <strong>Large:</strong> 40x40cm - Great for statement pieces</div>
          </div>
        </div>
      </div>


      {/* Storage Options */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="saveToStorage"
            checked={saveToStorage}
            onCheckedChange={setSaveToStorage}
          />
          <Label htmlFor="saveToStorage" className="text-sm">
            Remember my information for future bookings
          </Label>
        </div>

        {getGuestFormData() && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="clearStorage"
              checked={clearStorageData}
              onCheckedChange={setClearStorageData}
            />
            <Label htmlFor="clearStorage" className="text-sm">
              Clear saved information after booking
            </Label>
          </div>
        )}
      </div>

      {/* Account Creation Notice */}
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <div className="text-sm">
            <strong>First time booking?</strong> We&apos;ll automatically create an account for you.
            Check your email for activation instructions and booking confirmation.
          </div>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Booking...
            </>
          ) : (
            "Book Class"
          )}
        </Button>
      </div>
    </form>
  )
}