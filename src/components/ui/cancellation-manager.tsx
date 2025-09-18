'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  XCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Shield,
  Calendar,
  User
} from 'lucide-react'
import { format, differenceInHours } from 'date-fns'

interface CancellationManagerProps {
  reservation: {
    id: string
    student: {
      id: string
      name: string
      email: string
    }
    class: {
      id: string
      name: string
      startsAt: string
      endsAt: string
    }
    package?: {
      id: string
      name: string
      creditsUsed: number
      totalCredits: number
    }
    reservedAt: string
    status: string
  }
  onCancel: (data: any) => Promise<void>
  className?: string
}

const CANCELLATION_REASONS = [
  { value: 'STUDENT_SICK', label: 'Student is sick', category: 'health' },
  { value: 'STUDENT_EMERGENCY', label: 'Student emergency', category: 'emergency' },
  { value: 'STUDENT_REQUEST', label: 'Student requested cancellation', category: 'request' },
  { value: 'STUDIO_CLOSED', label: 'Studio closed/maintenance', category: 'studio' },
  { value: 'INSTRUCTOR_UNAVAILABLE', label: 'Instructor unavailable', category: 'studio' },
  { value: 'WEATHER_CONDITIONS', label: 'Weather conditions', category: 'external' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment failure', category: 'studio' },
  { value: 'DOUBLE_BOOKING', label: 'Double booking error', category: 'admin' },
  { value: 'ADMIN_OVERRIDE', label: 'Administrative override', category: 'admin' },
  { value: 'OTHER', label: 'Other (specify below)', category: 'other' }
]

export function CancellationManager({ reservation, onCancel, className }: CancellationManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [restoreCredits, setRestoreCredits] = useState(true)
  const [overridePolicy, setOverridePolicy] = useState(false)
  const [loading, setLoading] = useState(false)

  const classStartTime = new Date(reservation.class.startsAt)
  const hoursUntilClass = differenceInHours(classStartTime, new Date())
  const isWithin24Hours = hoursUntilClass < 24 && hoursUntilClass > 0
  const isPastClass = hoursUntilClass <= 0
  const needsOverride = isWithin24Hours || isPastClass

  const selectedReasonData = CANCELLATION_REASONS.find(r => r.value === reason)
  const isStudioReason = selectedReasonData?.category === 'studio' || selectedReasonData?.category === 'admin'
  const isEmergencyReason = selectedReasonData?.category === 'emergency' || selectedReasonData?.category === 'health'

  // Auto-set policy override for certain reasons
  const shouldAutoOverride = isStudioReason || isEmergencyReason

  const handleCancel = async () => {
    if (!reason) return

    setLoading(true)
    try {
      const cancellationData = {
        reservationId: reservation.id,
        reason: reason,
        customReason: reason === 'OTHER' ? customReason : undefined,
        restoreCredits: restoreCredits,
        policyOverride: overridePolicy || shouldAutoOverride,
        adminCancellation: true,
        hoursBeforeClass: Math.max(0, hoursUntilClass)
      }

      await onCancel(cancellationData)
      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error('Cancellation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setReason('')
    setCustomReason('')
    setRestoreCredits(true)
    setOverridePolicy(false)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'health':
      case 'emergency':
        return 'bg-red-100 text-red-800'
      case 'studio':
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'external':
        return 'bg-orange-100 text-orange-800'
      case 'request':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (reservation.status === 'CANCELLED') {
    return (
      <Badge variant="outline" className="text-red-600 border-red-200">
        Already Cancelled
      </Badge>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Reservation
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cancel Reservation</DialogTitle>
          <DialogDescription>
            Cancel this reservation with appropriate reason and credit handling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reservation Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Student</Label>
                  <p className="font-medium">{reservation.student.name}</p>
                  <p className="text-xs text-gray-500">{reservation.student.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Class</Label>
                  <p className="font-medium">{reservation.class.name}</p>
                  <p className="text-xs text-gray-500">
                    {format(classStartTime, 'PPP p')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time Until Class</Label>
                  <p className={`font-medium ${isWithin24Hours ? 'text-orange-600' : isPastClass ? 'text-red-600' : 'text-green-600'}`}>
                    {isPastClass ? 'Class has passed' :
                     isWithin24Hours ? `${hoursUntilClass} hours` :
                     `${Math.round(hoursUntilClass / 24)} days`}
                  </p>
                </div>
                {reservation.package && (
                  <div>
                    <Label className="text-muted-foreground">Package</Label>
                    <p className="font-medium">{reservation.package.name}</p>
                    <p className="text-xs text-gray-500">
                      {reservation.package.creditsUsed}/{reservation.package.totalCredits} credits used
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Policy Warning */}
          {needsOverride && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Policy Notice:</strong> {isPastClass
                  ? 'This class has already started/ended. Cancellation requires admin override.'
                  : 'This cancellation is within 24 hours of the class. Normal policy would not restore credits.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Reason */}
          <div>
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select cancellation reason..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{reasonOption.label}</span>
                      <Badge
                        variant="outline"
                        className={`ml-2 text-xs ${getCategoryColor(reasonOption.category)}`}
                      >
                        {reasonOption.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedReasonData && (
              <div className="mt-2">
                <Badge className={getCategoryColor(selectedReasonData.category)}>
                  {selectedReasonData.category.charAt(0).toUpperCase() + selectedReasonData.category.slice(1)} Reason
                </Badge>
                {shouldAutoOverride && (
                  <Badge className="ml-2 bg-green-100 text-green-800">
                    Auto-override enabled
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Custom Reason */}
          {reason === 'OTHER' && (
            <div>
              <Label htmlFor="customReason">Please specify the reason *</Label>
              <Textarea
                id="customReason"
                placeholder="Provide specific details for the cancellation..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* Credit Restoration */}
          {reservation.package && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restoreCredits"
                  checked={restoreCredits}
                  onCheckedChange={(checked) => setRestoreCredits(checked as boolean)}
                />
                <Label htmlFor="restoreCredits" className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Restore 1 credit to student&apos;s package</span>
                </Label>
              </div>
              {restoreCredits && (
                <Alert className="border-green-200 bg-green-50">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    1 credit will be restored to <strong>{reservation.package.name}</strong>.
                    New balance will be: {reservation.package.totalCredits - reservation.package.creditsUsed + 1}/{reservation.package.totalCredits} credits.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Policy Override */}
          {needsOverride && !shouldAutoOverride && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overridePolicy"
                  checked={overridePolicy}
                  onCheckedChange={(checked) => setOverridePolicy(checked as boolean)}
                />
                <Label htmlFor="overridePolicy" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Override 24-hour cancellation policy</span>
                </Label>
              </div>
              {overridePolicy && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    You are overriding the standard cancellation policy. This action will be logged for audit purposes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Summary */}
          {reason && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cancellation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Reason:</span>
                  <span className="font-medium">
                    {selectedReasonData?.label}
                    {reason === 'OTHER' && customReason && ` (${customReason})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Credits restored:</span>
                  <span className="font-medium">{restoreCredits ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Policy override:</span>
                  <span className="font-medium">{(overridePolicy || shouldAutoOverride) ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours before class:</span>
                  <span className="font-medium">{Math.max(0, Math.round(hoursUntilClass))}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCancel}
              disabled={
                loading ||
                !reason ||
                (reason === 'OTHER' && !customReason.trim()) ||
                (needsOverride && !overridePolicy && !shouldAutoOverride)
              }
              variant="destructive"
            >
              {loading ? 'Processing...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}