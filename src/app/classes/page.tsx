'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
} from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  Filter,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Star
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import GuestBookingForm from '@/components/ui/guest-booking-form'

interface PublicClass {
  id: string
  uuid: string
  startsAt: string
  endsAt: string
  capacity: number
  price: number
  status: string
  notes?: string
  classType: {
    id: string
    name: string
    slug: string
    description: string
    durationMinutes: number
  }
  instructor: {
    id: string
    name: string
    firstName: string
    lastName: string
  } | null
  location: {
    id: string
    name: string
    address: string
  }
  availability: {
    totalSpots: number
    bookedSpots: number
    availableSpots: number
    isFull: boolean
    canBook: boolean
  }
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

interface FilterOptions {
  classTypes: Array<{
    id: string
    name: string
    slug: string
    description: string
  }>
  instructors: Array<{
    id: string
    name: string
    firstName: string
    lastName: string
  }>
}

export default function PublicClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<PublicClass[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ classTypes: [], instructors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [classTypeFilter, setClassTypeFilter] = useState('all')
  const [instructorFilter, setInstructorFilter] = useState('all')
  const [weeksAhead, setWeeksAhead] = useState(4)

  // Booking modal
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<PublicClass | null>(null)

  const loadClasses = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        weeks: weeksAhead.toString(),
      })

      if (classTypeFilter && classTypeFilter !== 'all') params.append('classType', classTypeFilter)
      if (instructorFilter && instructorFilter !== 'all') params.append('instructor', instructorFilter)

      const response = await fetch(`/api/public/classes?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load classes')
      }

      const data = await response.json()
      setClasses(data.classes)
      setFilterOptions(data.filters)

    } catch (error) {
      console.error('Error loading classes:', error)
      setError(error instanceof Error ? error.message : 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const openBookingModal = (classItem: PublicClass) => {
    setSelectedClass(classItem)
    setBookingOpen(true)
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm')
  }

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'EEE, MMM dd')
  }

  const groupClassesByDate = (classes: PublicClass[]) => {
    const grouped: { [date: string]: PublicClass[] } = {}

    classes.forEach(classItem => {
      const date = format(parseISO(classItem.startsAt), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(classItem)
    })

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }

  const getAvailabilityColor = (availability: PublicClass['availability']) => {
    if (availability.isFull) return 'text-red-600'
    if (availability.availableSpots <= 2) return 'text-orange-600'
    return 'text-green-600'
  }

  const getFrameAvailabilityColor = (available: number) => {
    if (available === 0) return 'text-red-600'
    if (available === 1) return 'text-orange-600'
    return 'text-green-600'
  }

  const renderFrameAvailability = (frameAvailability: PublicClass['frameAvailability']) => {
    return (
      <div className="flex flex-wrap gap-3">
        <div className={`text-xs px-2 py-1 rounded-md border ${getFrameAvailabilityColor(frameAvailability.small.available)}`}>
          <span className="font-medium">Small:</span> {frameAvailability.small.available}/{frameAvailability.small.capacity}
        </div>
        <div className={`text-xs px-2 py-1 rounded-md border ${getFrameAvailabilityColor(frameAvailability.medium.available)}`}>
          <span className="font-medium">Medium:</span> {frameAvailability.medium.available}/{frameAvailability.medium.capacity}
        </div>
        <div className={`text-xs px-2 py-1 rounded-md border ${getFrameAvailabilityColor(frameAvailability.large.available)}`}>
          <span className="font-medium">Large:</span> {frameAvailability.large.available}/{frameAvailability.large.capacity}
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadClasses()
  }, [classTypeFilter, instructorFilter, weeksAhead])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  const groupedClasses = groupClassesByDate(classes)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Schedule</h1>
          <p className="text-muted-foreground">
            Book classes at EME Estudio - No account required
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={loadClasses}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
          >
            Already have an account?
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Class Type</Label>
              <Select value={classTypeFilter} onValueChange={setClassTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {filterOptions.classTypes.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Instructor</Label>
              <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All instructors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instructors</SelectItem>
                  {filterOptions.instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.name}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Weeks Ahead</Label>
              <Select value={weeksAhead.toString()} onValueChange={(value) => setWeeksAhead(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="3">3 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setClassTypeFilter('all')
                  setInstructorFilter('all')
                  setWeeksAhead(4)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Schedule */}
      <div className="space-y-6">
        {groupedClasses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                No classes found for the selected criteria.
              </div>
            </CardContent>
          </Card>
        ) : (
          groupedClasses.map(([date, dayClasses]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle>{dayClasses[0] ? formatDate(dayClasses[0].startsAt) : 'No classes'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {dayClasses.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">
                              {classItem.classType.name}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="mr-2 h-4 w-4" />
                              {formatTime(classItem.startsAt)} - {formatTime(classItem.endsAt)}
                            </div>

                            {classItem.instructor && (
                              <div className="flex items-center text-muted-foreground">
                                <User className="mr-2 h-4 w-4" />
                                {classItem.instructor.name}
                              </div>
                            )}

                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="mr-2 h-4 w-4" />
                              {classItem.location.name}
                            </div>
                          </div>

                          {/* Frame Size Availability */}
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Tufting Gun Availability:
                            </div>
                            {renderFrameAvailability(classItem.frameAvailability)}
                          </div>

                          {classItem.classType.description && (
                            <p className="text-sm text-muted-foreground">
                              {classItem.classType.description}
                            </p>
                          )}
                        </div>

                        <div className="ml-4">
                          {classItem.availability.canBook ? (
                            <Button
                              onClick={() => openBookingModal(classItem)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Book Class
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Class Full
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Guest Booking Modal */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Class</DialogTitle>
            <DialogDescription>
              {selectedClass && (
                <>
                  {selectedClass.classType.name} on{' '}
                  {formatDate(selectedClass.startsAt)} at{' '}
                  {formatTime(selectedClass.startsAt)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <GuestBookingForm
              classData={selectedClass}
              onSuccess={() => {
                setBookingOpen(false)
                loadClasses() // Refresh to show updated availability
              }}
              onCancel={() => setBookingOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}