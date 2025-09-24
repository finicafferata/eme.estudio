'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
import GuestBookingFormV2 from '@/components/ui/guest-booking-form-v2'
import { t } from '@/lib/translations'

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
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <div className={`text-xs px-2 py-1 rounded-md border ${getFrameAvailabilityColor(frameAvailability.small.available)} flex-shrink-0`}>
          <span className="font-medium">{t('small')}:</span> {frameAvailability.small.available}/{frameAvailability.small.capacity}
        </div>
        <div className={`text-xs px-2 py-1 rounded-md border ${getFrameAvailabilityColor(frameAvailability.medium.available)} flex-shrink-0`}>
          <span className="font-medium">{t('medium')}:</span> {frameAvailability.medium.available}/{frameAvailability.medium.capacity}
        </div>
        <div className={`text-xs px-2 py-1 rounded-md border ${getFrameAvailabilityColor(frameAvailability.large.available)} flex-shrink-0`}>
          <span className="font-medium">{t('large')}:</span> {frameAvailability.large.available}/{frameAvailability.large.capacity}
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
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex justify-center">
            <Image
              src="/images/eme-logo.png"
              alt="EME Studio Logo"
              width={60}
              height={60}
              className="h-12 w-12 sm:h-15 sm:w-15 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('classSchedule')}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t('bookClassesAtEme')}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={loadClasses}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto"
          >
            {t('alreadyHaveAccount')}
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
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium">{t('classType')}</Label>
              <Select value={classTypeFilter} onValueChange={setClassTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  {filterOptions.classTypes.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">{t('instructor')}</Label>
              <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('allInstructors')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allInstructors')}</SelectItem>
                  {filterOptions.instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.name}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">{t('weeksAhead')}</Label>
              <Select value={weeksAhead.toString()} onValueChange={(value) => setWeeksAhead(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 {t('weeks')}</SelectItem>
                  <SelectItem value="3">3 {t('weeks')}</SelectItem>
                  <SelectItem value="4">4 {t('weeks')}</SelectItem>
                  <SelectItem value="6">6 {t('weeks')}</SelectItem>
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
                className="w-full"
              >
                {t('clearFilters')}
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
                {t('noClassesFound')}
              </div>
            </CardContent>
          </Card>
        ) : (
          groupedClasses.map(([date, dayClasses]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle>{dayClasses[0] ? formatDate(dayClasses[0].startsAt) : t('noClasses')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {dayClasses.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">
                              {classItem.classType.name}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{formatTime(classItem.startsAt)} - {formatTime(classItem.endsAt)}</span>
                            </div>

                            {classItem.instructor && (
                              <div className="flex items-center text-muted-foreground">
                                <User className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{classItem.instructor.name}</span>
                              </div>
                            )}

                            <div className="flex items-center text-muted-foreground sm:col-span-2 lg:col-span-1">
                              <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{classItem.location.name}</span>
                            </div>
                          </div>

                          {/* Frame Size Availability */}
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              {t('tuftingGunAvailability')}
                            </div>
                            {renderFrameAvailability(classItem.frameAvailability)}
                          </div>

                          {classItem.classType.description && (
                            <p className="text-sm text-muted-foreground">
                              {classItem.classType.description}
                            </p>
                          )}
                        </div>

                        <div className="lg:ml-4 flex-shrink-0">
                          {classItem.availability.canBook ? (
                            <Button
                              onClick={() => openBookingModal(classItem)}
                              className="bg-green-600 hover:bg-green-700 w-full lg:w-auto"
                              size="sm"
                            >
                              {t('bookClass')}
                            </Button>
                          ) : (
                            <Button variant="outline" disabled className="w-full lg:w-auto" size="sm">
                              {t('classFull')}
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
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{t('bookClass')}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedClass && (
                <>
                  {selectedClass.classType.name} {t('on')}{' '}
                  {formatDate(selectedClass.startsAt)} {t('at')}{' '}
                  {formatTime(selectedClass.startsAt)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <GuestBookingFormV2
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