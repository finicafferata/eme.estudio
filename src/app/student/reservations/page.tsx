'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Download,
  RotateCcw,
  CreditCard
} from 'lucide-react'
import { format, parseISO, isPast, isFuture, differenceInHours } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ReservationItem {
  id: string
  status: string
  reservedAt: string
  checkedInAt?: string
  cancelledAt?: string
  cancellationReason?: string
  notes?: string
  class: {
    id: string
    startsAt: string
    endsAt: string
    capacity: number
    price: number
    status: string
    classType: {
      id: string
      name: string
      description: string
      durationMinutes: number
    }
    instructor: {
      id: string
      name: string
      email: string
    } | null
    location: {
      id: string
      name: string
      address: string
    }
  }
  package: {
    id: string
    name: string
    classTypeName?: string
  } | null
}

interface Summary {
  upcoming: number
  completed: number
  cancelled: number
  total: number
}

export default function StudentReservationsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [summary, setSummary] = useState<Summary>({ upcoming: 0, completed: 0, cancelled: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('upcoming')
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    reservation: ReservationItem | null
    reason: string
    loading: boolean
    error: string
  }>({
    isOpen: false,
    reservation: null,
    reason: '',
    loading: false,
    error: ''
  })
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean
    reservation: ReservationItem | null
    availableClasses: any[]
    selectedClass: string | null
    loading: boolean
    error: string
  }>({
    isOpen: false,
    reservation: null,
    availableClasses: [],
    selectedClass: null,
    loading: false,
    error: ''
  })

  const loadReservations = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/student/reservations?filter=${filter}`)
      if (!response.ok) {
        throw new Error('Failed to load reservations')
      }

      const data = await response.json()
      setReservations(data.reservations)
      setSummary(data.summary)

    } catch (error) {
      console.error('Error loading reservations:', error)
      setError(error instanceof Error ? error.message : 'Failed to load reservations')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, classStartsAt: string) => {
    const isClassPast = isPast(parseISO(classStartsAt))

    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge className={isClassPast ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
            <Calendar className="w-3 h-3 mr-1" />
            {isClassPast ? 'Missed' : 'Confirmed'}
          </Badge>
        )
      case 'CHECKED_IN':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Attended
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        )
      case 'NO_SHOW':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            No Show
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = parseISO(dateString)
    return {
      date: format(date, 'EEE, MMM dd'),
      time: format(date, 'HH:mm')
    }
  }

  const canCancelReservation = (reservation: ReservationItem) => {
    const classStart = parseISO(reservation.class.startsAt)
    const now = new Date()
    const hoursUntilClass = differenceInHours(classStart, now)

    return (
      reservation.status === 'CONFIRMED' &&
      hoursUntilClass >= 24 // Can cancel up to 24 hours before class
    )
  }

  const getHoursUntilClass = (reservation: ReservationItem) => {
    const classStart = parseISO(reservation.class.startsAt)
    const now = new Date()
    return differenceInHours(classStart, now)
  }

  const handleCancelClick = (reservation: ReservationItem) => {
    setCancelModal({
      isOpen: true,
      reservation,
      reason: '',
      loading: false,
      error: ''
    })
  }

  const handleCancelConfirm = async () => {
    if (!cancelModal.reservation) return

    setCancelModal(prev => ({ ...prev, loading: true, error: '' }))

    try {
      const response = await fetch(`/api/student/reservations/${cancelModal.reservation.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelModal.reason || 'Student requested cancellation'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel reservation')
      }

      // Success - reload reservations and close modal
      await loadReservations()
      setCancelModal({
        isOpen: false,
        reservation: null,
        reason: '',
        loading: false,
        error: ''
      })

      // Show success message
      setError('')
      setSuccess(`Your reservation for ${data.cancellation.className} has been cancelled successfully. ${data.cancellation.creditRestored ? 'Your credit has been restored.' : ''}`)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)

    } catch (error) {
      console.error('Cancellation error:', error)
      setCancelModal(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to cancel reservation'
      }))
    }
  }

  const handleCancelModalClose = () => {
    setCancelModal({
      isOpen: false,
      reservation: null,
      reason: '',
      loading: false,
      error: ''
    })
  }

  const downloadAttendanceHistory = () => {
    const csvHeaders = [
      'Date',
      'Class',
      'Instructor',
      'Status',
      'Check-in Time',
      'Package Used',
      'Credits Consumed',
      'Location',
      'Cancellation Reason'
    ]

    const csvData = reservations.map(reservation => [
      format(parseISO(reservation.class.startsAt), 'yyyy-MM-dd'),
      reservation.class.classType.name,
      reservation.class.instructor?.name || 'No instructor',
      reservation.status === 'COMPLETED' ? 'Attended' :
      reservation.status === 'CHECKED_IN' ? 'Attended' :
      reservation.status,
      reservation.checkedInAt ? format(parseISO(reservation.checkedInAt), 'HH:mm') : '',
      reservation.package?.name || 'No package',
      reservation.package ? '1' : '0',
      reservation.class.location.name,
      reservation.cancellationReason || ''
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `attendance_history_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const canRescheduleReservation = (reservation: ReservationItem) => {
    return canCancelReservation(reservation) // Same logic as cancellation
  }

  const handleRescheduleClick = async (reservation: ReservationItem) => {
    setRescheduleModal(prev => ({ ...prev, loading: true, error: '' }))

    try {
      // Load available classes for rescheduling
      const response = await fetch('/api/student/classes')
      if (!response.ok) {
        throw new Error('Failed to load available classes')
      }

      const data = await response.json()

      // Filter out current class and show only compatible classes
      const availableClasses = data.classes.filter((cls: any) =>
        cls.id !== reservation.class.id &&
        cls.eligibility.canBook &&
        differenceInHours(parseISO(cls.startsAt), new Date()) >= 24
      )

      setRescheduleModal({
        isOpen: true,
        reservation,
        availableClasses,
        selectedClass: null,
        loading: false,
        error: ''
      })

    } catch (error) {
      console.error('Error loading classes for reschedule:', error)
      setRescheduleModal(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load available classes'
      }))
    }
  }

  const handleRescheduleConfirm = async () => {
    if (!rescheduleModal.reservation || !rescheduleModal.selectedClass) return

    setRescheduleModal(prev => ({ ...prev, loading: true, error: '' }))

    try {
      const response = await fetch(`/api/student/reservations/${rescheduleModal.reservation.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newClassId: rescheduleModal.selectedClass
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule reservation')
      }

      // Success - reload reservations and close modal
      await loadReservations()
      setRescheduleModal({
        isOpen: false,
        reservation: null,
        availableClasses: [],
        selectedClass: null,
        loading: false,
        error: ''
      })

      setSuccess(`Your class has been rescheduled successfully to ${data.newClass.name} on ${format(parseISO(data.newClass.startsAt), 'EEE, MMM dd • HH:mm')}`)
      setTimeout(() => setSuccess(''), 5000)

    } catch (error) {
      console.error('Reschedule error:', error)
      setRescheduleModal(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule reservation'
      }))
    }
  }

  const handleRescheduleModalClose = () => {
    setRescheduleModal({
      isOpen: false,
      reservation: null,
      availableClasses: [],
      selectedClass: null,
      loading: false,
      error: ''
    })
  }

  useEffect(() => {
    loadReservations()
  }, [filter])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Reservations</h1>
          <p className="text-muted-foreground">Manage your booked classes and view your schedule</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={downloadAttendanceHistory}
            disabled={loading || reservations.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download History
          </Button>
          <Button
            variant="outline"
            onClick={loadReservations}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild>
            <a href="/student/classes">
              <Plus className="mr-2 h-4 w-4" />
              Book a Class
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.upcoming}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.cancelled}</div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Reservations</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Reservations List */}
      <div className="space-y-4">
        {reservations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {filter === 'upcoming' ? 'No upcoming reservations' :
                 filter === 'past' ? 'No past reservations' : 'No reservations found'}
              </div>
              {filter === 'upcoming' && (
                <Button asChild className="mt-4">
                  <a href="/student/classes">Browse Available Classes</a>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          reservations.map((reservation) => {
            const { date, time } = formatDateTime(reservation.class.startsAt)
            const endTime = format(parseISO(reservation.class.endsAt), 'HH:mm')

            return (
              <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold">{reservation.class.classType.name}</h3>
                        {getStatusBadge(reservation.status, reservation.class.startsAt)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          {date}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4" />
                          {time} - {endTime}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="mr-2 h-4 w-4" />
                          {reservation.class.location.name}
                        </div>
                      </div>

                      {reservation.class.instructor && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="mr-2 h-4 w-4" />
                          Instructor: {reservation.class.instructor.name}
                        </div>
                      )}

                      {reservation.package && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Package: {reservation.package.name}
                          {reservation.package.classTypeName && ` (${reservation.package.classTypeName})`}
                          • 1 credit used
                        </div>
                      )}

                      {reservation.checkedInAt && (
                        <div className="text-sm text-green-600">
                          ✓ Checked in at {format(parseISO(reservation.checkedInAt), 'HH:mm')}
                        </div>
                      )}

                      {reservation.cancellationReason && (
                        <div className="text-sm text-red-600">
                          Cancellation reason: {reservation.cancellationReason}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      {canRescheduleReservation(reservation) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleRescheduleClick(reservation)}
                          disabled={rescheduleModal.loading}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Reschedule
                        </Button>
                      )}
                      {canCancelReservation(reservation) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleCancelClick(reservation)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        reservation.status === 'CONFIRMED' && (
                          <div className="text-xs text-muted-foreground text-center max-w-[80px]">
                            {getHoursUntilClass(reservation) < 24 && getHoursUntilClass(reservation) > 0
                              ? `Cannot modify (${Math.round(getHoursUntilClass(reservation))}h remaining)`
                              : ''}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Cancellation Modal */}
      <Dialog open={cancelModal.isOpen} onOpenChange={handleCancelModalClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your reservation for{' '}
              <strong>{cancelModal.reservation?.class.classType.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {cancelModal.reservation && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Class:</span>
                  <span>{cancelModal.reservation.class.classType.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Date & Time:</span>
                  <span>
                    {format(parseISO(cancelModal.reservation.class.startsAt), 'EEE, MMM dd • HH:mm')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Hours until class:</span>
                  <span className="font-medium text-blue-600">
                    {getHoursUntilClass(cancelModal.reservation)} hours
                  </span>
                </div>
                {cancelModal.reservation.package && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Package:</span>
                    <span>{cancelModal.reservation.package.name}</span>
                  </div>
                )}
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-sm">
                <div className="font-medium text-green-800 mb-1">✓ Policy Compliant</div>
                <div className="text-green-700">
                  {cancelModal.reservation.package
                    ? 'Your credit will be automatically restored to your package.'
                    : 'You can cancel this reservation without penalty.'}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Schedule conflict, feeling unwell, etc."
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                  disabled={cancelModal.loading}
                />
              </div>

              {cancelModal.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{cancelModal.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelModalClose}
              disabled={cancelModal.loading}
            >
              Keep Reservation
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancelModal.loading}
            >
              {cancelModal.loading ? 'Cancelling...' : 'Cancel Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModal.isOpen} onOpenChange={handleRescheduleModalClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reschedule Reservation</DialogTitle>
            <DialogDescription>
              Choose a new class for your reservation. Your credits will be transferred automatically.
            </DialogDescription>
          </DialogHeader>

          {rescheduleModal.reservation && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
                <h4 className="font-medium text-blue-800">Current Booking:</h4>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Class:</span>
                  <span>{rescheduleModal.reservation.class.classType.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Date & Time:</span>
                  <span>
                    {format(parseISO(rescheduleModal.reservation.class.startsAt), 'EEE, MMM dd • HH:mm')}
                  </span>
                </div>
                {rescheduleModal.reservation.package && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Package:</span>
                    <span>{rescheduleModal.reservation.package.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Select New Class:</Label>
                {rescheduleModal.loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading available classes...</p>
                  </div>
                ) : rescheduleModal.availableClasses.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No alternative classes available for rescheduling at this time.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {rescheduleModal.availableClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          rescheduleModal.selectedClass === cls.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setRescheduleModal(prev => ({ ...prev, selectedClass: cls.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{cls.classType.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(parseISO(cls.startsAt), 'EEE, MMM dd • HH:mm')} - {format(parseISO(cls.endsAt), 'HH:mm')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {cls.instructor.name} • {cls.location.name}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">
                              {cls.availableSpots} spots left
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {rescheduleModal.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{rescheduleModal.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleRescheduleModalClose}
              disabled={rescheduleModal.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRescheduleConfirm}
              disabled={rescheduleModal.loading || !rescheduleModal.selectedClass}
            >
              {rescheduleModal.loading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}