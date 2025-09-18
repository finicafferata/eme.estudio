'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  RefreshCw
} from 'lucide-react'
import { format, parseISO, isSameDay, startOfWeek, addWeeks } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ClassItem {
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
    email: string
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
    isUserBooked: boolean
  }
  eligibility: {
    status: 'eligible' | 'no_package' | 'wrong_type' | 'no_credits'
    eligiblePackages: Array<{
      id: string
      name: string
      remainingCredits: number
      classTypeName?: string
    }>
    canBook: boolean
  }
}

interface UserPackage {
  id: string
  name: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  expiresAt?: string
  classType?: {
    id: string
    name: string
    slug: string
  } | null
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

export default function StudentClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [userPackages, setUserPackages] = useState<UserPackage[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ classTypes: [], instructors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [classTypeFilter, setClassTypeFilter] = useState('all')
  const [instructorFilter, setInstructorFilter] = useState('all')
  const [weeksAhead, setWeeksAhead] = useState(4)

  // Booking modal
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [selectedPackage, setSelectedPackage] = useState('none')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  const loadClasses = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        weeks: weeksAhead.toString(),
      })

      if (classTypeFilter && classTypeFilter !== 'all') params.append('classType', classTypeFilter)
      if (instructorFilter && instructorFilter !== 'all') params.append('instructor', instructorFilter)

      const response = await fetch(`/api/student/classes?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load classes')
      }

      const data = await response.json()
      setClasses(data.classes)
      setUserPackages(data.userPackages)
      setFilterOptions(data.filters)

    } catch (error) {
      console.error('Error loading classes:', error)
      setError(error instanceof Error ? error.message : 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  const handleBookClass = async () => {
    if (!selectedClass || !selectedPackage || selectedPackage === 'none') return

    try {
      setBookingLoading(true)
      setBookingError('')

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: selectedClass.id,
          packageId: selectedPackage === 'none' ? undefined : selectedPackage
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to book class')
      }

      const result = await response.json()
      setBookingResult(result)
      setBookingSuccess(true)

      // Refresh data to show updated availability and credits
      loadClasses()

    } catch (error) {
      console.error('Error booking class:', error)
      setBookingError(error instanceof Error ? error.message : 'Failed to book class')
    } finally {
      setBookingLoading(false)
    }
  }

  const openBookingModal = (classItem: ClassItem) => {
    setSelectedClass(classItem)
    setSelectedPackage('none')
    setBookingError('')
    setBookingSuccess(false)
    setBookingResult(null)
    setBookingOpen(true)
  }

  const getEligibilityBadge = (eligibility: ClassItem['eligibility']) => {
    switch (eligibility.status) {
      case 'eligible':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Eligible
          </Badge>
        )
      case 'no_package':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            No Package
          </Badge>
        )
      case 'wrong_type':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Wrong Type
          </Badge>
        )
      case 'no_credits':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <CreditCard className="w-3 h-3 mr-1" />
            No Credits
          </Badge>
        )
    }
  }

  const getAvailabilityColor = (availability: ClassItem['availability']) => {
    if (availability.isFull) return 'text-red-600'
    if (availability.availableSpots <= 2) return 'text-orange-600'
    return 'text-green-600'
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm')
  }

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'EEE, MMM dd')
  }

  const groupClassesByDate = (classes: ClassItem[]) => {
    const grouped: { [date: string]: ClassItem[] } = {}

    classes.forEach(classItem => {
      const date = format(parseISO(classItem.startsAt), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(classItem)
    })

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
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
          <h1 className="text-3xl font-bold tracking-tight">Available Classes</h1>
          <p className="text-muted-foreground">
            Book classes using your package credits
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadClasses}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* User Packages Summary */}
      {userPackages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Your Active Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPackages.map((pkg) => (
                <div key={pkg.id} className="border rounded-lg p-4">
                  <div className="font-medium">{pkg.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {pkg.classType ? `For ${pkg.classType.name}` : 'General package'}
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-bold text-green-600">
                      {pkg.remainingCredits} credits left
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {pkg.totalCredits} total
                    </div>
                  </div>
                  {pkg.expiresAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Expires {format(parseISO(pkg.expiresAt), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
                <CardTitle>{formatDate(dayClasses[0].startsAt)}</CardTitle>
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
                            {getEligibilityBadge(classItem.eligibility)}
                            {classItem.availability.isUserBooked && (
                              <Badge className="bg-blue-100 text-blue-800">
                                Booked
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

                            <div className={`flex items-center font-medium ${getAvailabilityColor(classItem.availability)}`}>
                              <Users className="mr-2 h-4 w-4" />
                              {classItem.availability.availableSpots} spots left
                            </div>
                          </div>

                          {classItem.classType.description && (
                            <p className="text-sm text-muted-foreground">
                              {classItem.classType.description}
                            </p>
                          )}
                        </div>

                        <div className="ml-4">
                          {classItem.eligibility.canBook ? (
                            <Button
                              onClick={() => openBookingModal(classItem)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Book Class
                            </Button>
                          ) : classItem.availability.isUserBooked ? (
                            <Button variant="outline" disabled>
                              Already Booked
                            </Button>
                          ) : classItem.availability.isFull ? (
                            <Button variant="outline" disabled>
                              Class Full
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Not Eligible
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

      {/* Booking Modal */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
            <div className="space-y-4">
              {/* Success Message */}
              {bookingSuccess && bookingResult && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <div className="font-medium">Booking Confirmed!</div>
                      <div className="text-sm">
                        Your class has been successfully booked. You'll receive an email confirmation shortly with all the details.
                      </div>
                      <div className="text-sm">
                        <strong>Confirmation ID:</strong> {bookingResult.reservation?.id || 'Generated'}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {bookingError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{bookingError}</AlertDescription>
                </Alert>
              )}

              {!bookingSuccess && (
                <>
                  {/* Class Details Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="font-medium text-gray-900">Class Details</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Instructor:</span>
                        <div className="font-medium">{selectedClass.instructor?.name || 'TBA'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <div className="font-medium">{selectedClass.location.name}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <div className="font-medium">{selectedClass.classType.durationMinutes} minutes</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Spots Remaining:</span>
                        <div className="font-medium text-green-600">{selectedClass.availability.availableSpots}</div>
                      </div>
                    </div>
                  </div>

                  {/* Package Selection */}
                  <div className="space-y-3">
                    <Label>Select Package to Use</Label>
                    <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a package" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedClass.eligibility.eligiblePackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{pkg.name}</span>
                              <span className="text-sm text-green-600 ml-2">
                                {pkg.remainingCredits} credits left
                              </span>
                            </div>
                            {pkg.classTypeName && (
                              <div className="text-xs text-gray-500">{pkg.classTypeName} package</div>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Selected Package Details */}
                    {selectedPackage && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-blue-900">
                            Credit Usage
                          </div>
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="mt-2 text-sm text-blue-800">
                          1 credit will be deducted from your selected package after booking.
                        </div>
                        {(() => {
                          const pkg = selectedClass.eligibility.eligiblePackages.find(p => p.id === selectedPackage)
                          return pkg && (
                            <div className="mt-1 text-xs text-blue-700">
                              You'll have {pkg.remainingCredits - 1} credits remaining after this booking.
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                {bookingSuccess ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBookingOpen(false)
                        setBookingSuccess(false)
                        setBookingResult(null)
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => router.push('/student/reservations')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      View My Reservations
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setBookingOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBookClass}
                      disabled={!selectedPackage || bookingLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {bookingLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}