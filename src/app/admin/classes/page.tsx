'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { format, addDays, startOfWeek, addWeeks } from 'date-fns'
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  User,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CapacityManager } from '@/components/ui/capacity-manager'
import { ReservationManager } from '@/components/ui/reservation-manager'
import { ClassCompletionManager } from '@/components/ui/class-completion-manager'

// EME Studio Schedule Templates
const SCHEDULE_TEMPLATES = {
  morning_weekdays: {
    name: 'Morning Classes (Mon-Sat)',
    description: 'Monday to Saturday 10:00am - 12:30pm',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    startTime: '10:00',
    endTime: '12:30',
    duration: 150
  },
  afternoon_tue_thu: {
    name: 'Afternoon Classes (Tue/Thu)',
    description: 'Tuesday and Thursday 3:00pm - 5:30pm',
    days: ['Tuesday', 'Thursday'],
    startTime: '15:00',
    endTime: '17:30',
    duration: 150
  },
  afternoon_friday: {
    name: 'Afternoon Friday',
    description: 'Friday 2:00pm - 4:30pm',
    days: ['Friday'],
    startTime: '14:00',
    endTime: '16:30',
    duration: 150
  },
  evening_mon_wed: {
    name: 'Evening Classes (Mon/Wed)',
    description: 'Monday and Wednesday 6:00pm - 8:30pm',
    days: ['Monday', 'Wednesday'],
    startTime: '18:00',
    endTime: '20:30',
    duration: 150
  }
}

interface WeeklySchedule {
  week: {
    start: string
    end: string
  }
  days: Array<{
    date: string
    dayOfWeek: number
    dayName: string
    classes: ClassItem[]
  }>
}

interface ClassItem {
  id: string
  uuid: string
  startsAt: string
  endsAt: string
  capacity: number
  price: number
  status: string
  notes: string
  classType: {
    id: string
    name: string
    description: string
    durationMinutes: number
    maxCapacity: number
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
    capacity: number
  }
  reservations: Array<{
    id: string
    status: string
    student: {
      id: string
      name: string
      email: string
    }
  }>
  availableSpots: number
  waitlistCount?: number
  waitlist?: Array<{
    id: string
    priority: number
    student: {
      id: string
      name: string
      email: string
    }
    createdAt: string
  }>
}

interface ClassOptions {
  instructors: Array<{
    id: string
    name: string
    firstName: string
    lastName: string
    email: string
  }>
  locations: Array<{
    id: string
    name: string
    address: string
    capacity: number
  }>
  classTypes: Array<{
    id: string
    name: string
    description: string
    durationMinutes: number
    defaultPrice: number
    maxCapacity: number
  }>
  scheduleTemplates: any
  packageTypes: Array<{
    name: string
    description: string
    allowsPartialPayments: boolean
  }>
}

export default function ClassesPage() {
  const router = useRouter()
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [classOptions, setClassOptions] = useState<ClassOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Create Class Modal State
  const [createClassOpen, setCreateClassOpen] = useState(false)
  const [scheduleType, setScheduleType] = useState('single')
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [classTypeId, setClassTypeId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [capacity, setCapacity] = useState(6)
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [templateStartDate, setTemplateStartDate] = useState<Date>(new Date())

  // Class Details Modal State
  const [classDetailsOpen, setClassDetailsOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'FULL':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCapacityStatus = (availableSpots: number, capacity: number) => {
    const bookedSpots = capacity - availableSpots
    const percentFull = (bookedSpots / capacity) * 100

    if (availableSpots === 0) {
      return {
        status: 'FULL',
        color: 'bg-red-100 text-red-800',
        borderColor: 'border-red-200',
        cardColor: 'bg-red-50'
      }
    } else if (percentFull >= 80) {
      return {
        status: 'FEW_SPOTS',
        color: 'bg-orange-100 text-orange-800',
        borderColor: 'border-orange-200',
        cardColor: 'bg-orange-50'
      }
    } else {
      return {
        status: 'AVAILABLE',
        color: 'bg-green-100 text-green-800',
        borderColor: 'border-green-200',
        cardColor: 'bg-green-50'
      }
    }
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm')
  }

  const loadWeeklySchedule = async (weekStart: Date) => {
    try {
      const weekStartString = format(weekStart, 'yyyy-MM-dd')
      const response = await fetch(`/api/classes?view=week&week=${weekStartString}`)
      if (response.ok) {
        const data = await response.json()
        setSchedule(data.schedule)
      }
    } catch (error) {
      console.error('Error loading weekly schedule:', error)
    }
  }

  const loadClassOptions = async () => {
    try {
      const response = await fetch('/api/classes/options')
      if (response.ok) {
        const data = await response.json()
        setClassOptions(data)
      }
    } catch (error) {
      console.error('Error loading class options:', error)
    }
  }

  const handleCreateClass = async () => {
    try {
      const requestData: any = {
        classTypeId,
        instructorId: instructorId === 'none' || !instructorId ? null : instructorId,
        locationId,
        capacity: parseInt(capacity.toString()),
        price: parseFloat(price),
        notes
      }

      if (useTemplate && selectedTemplate) {
        requestData.scheduleTemplate = selectedTemplate
        requestData.startsAt = templateStartDate.toISOString()
      } else {
        // For single class creation, we'd need date/time selection
        // For now, let's focus on template-based creation
        return
      }

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        setCreateClassOpen(false)
        resetCreateClassForm()
        loadWeeklySchedule(currentWeek)
      }
    } catch (error) {
      console.error('Error creating class:', error)
    }
  }

  const resetCreateClassForm = () => {
    setScheduleType('single')
    setUseTemplate(false)
    setSelectedTemplate('')
    setClassTypeId('')
    setInstructorId('')
    setLocationId('')
    setCapacity(6)
    setPrice('')
    setNotes('')
    setTemplateStartDate(new Date())
  }

  const viewClassDetails = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedClass(data)
        setClassDetailsOpen(true)
      }
    } catch (error) {
      console.error('Error loading class details:', error)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addWeeks(currentWeek, direction === 'next' ? 1 : -1)
    setCurrentWeek(newWeek)
    loadWeeklySchedule(newWeek)
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadWeeklySchedule(currentWeek),
        loadClassOptions()
      ])
      setLoading(false)
    }
    loadData()
  }, [currentWeek])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const selectedTemplateData = selectedTemplate ? SCHEDULE_TEMPLATES[selectedTemplate as keyof typeof SCHEDULE_TEMPLATES] : null
  const selectedClassType = classOptions?.classTypes.find(ct => ct.id === classTypeId)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Calendar</h1>
          <p className="text-muted-foreground">Complete studio schedule at a glance with capacity tracking</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/patterns')}
          >
            Recurring Patterns
          </Button>
          <Dialog open={createClassOpen} onOpenChange={setCreateClassOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Classes
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Schedule New Classes</DialogTitle>
              <DialogDescription>
                Create classes using EME Studio&apos;s predefined time slots or schedule individual classes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select
                  value={scheduleType}
                  onValueChange={(value) => {
                    setScheduleType(value)
                    setUseTemplate(value === "template")
                    if (value === "pattern") {
                      setCreateClassOpen(false)
                      router.push('/admin/patterns')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Use EME Studio Schedule Template</SelectItem>
                    <SelectItem value="single">Schedule Individual Class</SelectItem>
                    <SelectItem value="pattern">Set up Recurring Pattern (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleType === "pattern" && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-900">Recurring Patterns</h4>
                      <p className="text-sm text-blue-800">
                        Set up templates like &quot;Monday 10am Intensivo with Male&quot; that automatically generate classes for weeks ahead.
                        Perfect for regular weekly schedules that repeat consistently.
                      </p>
                      <p className="text-sm text-blue-700">
                        Features: Auto-generation for 4-8 weeks, holiday skipping, pause/resume controls, and individual class modifications.
                      </p>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          className="bg-white hover:bg-blue-50"
                          onClick={() => router.push('/admin/patterns')}
                        >
                          Go to Recurring Patterns →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {useTemplate && (
                <div className="space-y-2">
                  <Label>Schedule Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a schedule template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SCHEDULE_TEMPLATES).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateData && (
                    <Card className="bg-blue-50">
                      <CardContent className="pt-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{selectedTemplateData.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Days: {selectedTemplateData.days.join(', ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Time: {selectedTemplateData.startTime} - {selectedTemplateData.endTime} ({selectedTemplateData.duration} minutes)
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class Type</Label>
                  <Select value={classTypeId} onValueChange={setClassTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class type" />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions?.classTypes.map((classType) => (
                        <SelectItem key={classType.id} value={classType.id}>
                          {classType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Instructor</Label>
                  <Select value={instructorId} onValueChange={setInstructorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No instructor assigned</SelectItem>
                      {classOptions?.instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions?.locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 6)}
                    min="1"
                    max={selectedClassType?.maxCapacity || 20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  placeholder="Class price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                {selectedClassType && (
                  <p className="text-sm text-muted-foreground">
                    Default price: ${selectedClassType.defaultPrice}
                  </p>
                )}
              </div>

              {useTemplate && (
                <div className="space-y-2">
                  <Label>Start Date (for template)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !templateStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {templateStartDate ? format(templateStartDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={templateStartDate}
                        onSelect={(date) => date && setTemplateStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Class notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateClassOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateClass}
                  disabled={!classTypeId || !locationId || (!useTemplate && !selectedTemplate)}
                >
                  {useTemplate ? 'Create Classes from Template' : 'Create Class'}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Overview and Legend */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-xs text-muted-foreground">Good availability</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Few Spots</p>
                <p className="text-xs text-muted-foreground">80%+ capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Full</p>
                <p className="text-xs text-muted-foreground">No spots left</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-semibold">
                {schedule ? schedule.days.reduce((total, day) => total + day.classes.length, 0) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Classes this week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <CardTitle className="text-lg">
                  Week of {format(currentWeek, 'MMMM dd, yyyy')}
                </CardTitle>
                <CardDescription>
                  {schedule && format(new Date(schedule.week.start), 'MMM dd')} - {schedule && format(new Date(schedule.week.end), 'MMM dd')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
                loadWeeklySchedule(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }}
            >
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedule && (
            <div className="grid grid-cols-7 gap-4">
              {schedule.days.map((day) => {
                const isToday = format(new Date(day.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const totalSpots = day.classes.reduce((sum, c) => sum + c.capacity, 0)
                const bookedSpots = day.classes.reduce((sum, c) => sum + (c.capacity - c.availableSpots), 0)

                return (
                  <div key={day.date} className="space-y-3">
                    <div className={cn(
                      "text-center p-3 rounded-lg border",
                      isToday ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    )}>
                      <div className="font-semibold text-sm">{day.dayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(day.date), 'MMM dd')}
                      </div>
                      {day.classes.length > 0 && (
                        <div className="mt-1">
                          <div className="text-xs font-medium text-gray-700">
                            {day.classes.length} classes
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bookedSpots}/{totalSpots} students
                          </div>
                        </div>
                      )}
                      {isToday && (
                        <div className="text-xs font-semibold text-blue-600 mt-1">TODAY</div>
                      )}
                    </div>

                  <div className="space-y-2 min-h-[200px]">
                    {day.classes.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground p-4">
                        No classes
                      </div>
                    ) : (
                      day.classes
                        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                        .map((classItem) => {
                          const capacityStatus = getCapacityStatus(classItem.availableSpots, classItem.capacity)
                          const bookedSpots = classItem.capacity - classItem.availableSpots

                          return (
                            <Card
                              key={classItem.id}
                              className={cn(
                                "cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4",
                                capacityStatus.borderColor,
                                capacityStatus.cardColor,
                                "hover:scale-[1.02]"
                              )}
                              onClick={() => viewClassDetails(classItem.id)}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  {/* Header with Status and Capacity */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Badge className={getStatusColor(classItem.status)} variant="secondary">
                                        {classItem.status}
                                      </Badge>
                                      <Badge className={capacityStatus.color} variant="secondary">
                                        {capacityStatus.status === 'FULL' ? 'FULL' :
                                         capacityStatus.status === 'FEW_SPOTS' ? 'FEW SPOTS' :
                                         'AVAILABLE'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Class Type and Time */}
                                  <div>
                                    <div className="font-semibold text-sm text-gray-900">
                                      {classItem.classType.name}
                                    </div>
                                    <div className="flex items-center text-xs font-medium text-gray-700">
                                      <Clock className="mr-1 h-3 w-3" />
                                      {formatTime(classItem.startsAt)} - {formatTime(classItem.endsAt)}
                                    </div>
                                  </div>

                                  {/* Instructor */}
                                  <div className="flex items-center text-xs text-gray-600">
                                    <User className="mr-1 h-3 w-3" />
                                    <span className="font-medium">
                                      {classItem.instructor ? classItem.instructor.name : 'No instructor'}
                                    </span>
                                  </div>

                                  {/* Location */}
                                  <div className="flex items-center text-xs text-gray-600">
                                    <MapPin className="mr-1 h-3 w-3" />
                                    {classItem.location.name}
                                  </div>

                                  {/* Capacity Bar and Count */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center text-gray-600">
                                        <Users className="mr-1 h-3 w-3" />
                                        {bookedSpots}/{classItem.capacity} students
                                      </span>
                                      <span className={cn(
                                        "font-semibold",
                                        capacityStatus.status === 'FULL' ? 'text-red-600' :
                                        capacityStatus.status === 'FEW_SPOTS' ? 'text-orange-600' :
                                        'text-green-600'
                                      )}>
                                        {classItem.availableSpots > 0 ? `${classItem.availableSpots} left` : 'FULL'}
                                      </span>
                                    </div>

                                    {/* Waitlist info for full classes */}
                                    {classItem.availableSpots === 0 && classItem.waitlistCount && classItem.waitlistCount > 0 && (
                                      <div className="flex items-center justify-between text-xs text-orange-600">
                                        <span>Waitlist:</span>
                                        <span className="font-semibold">{classItem.waitlistCount} waiting</span>
                                      </div>
                                    )}

                                    {/* Capacity Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={cn(
                                          "h-1.5 rounded-full transition-all duration-300",
                                          capacityStatus.status === 'FULL' ? 'bg-red-500' :
                                          capacityStatus.status === 'FEW_SPOTS' ? 'bg-orange-500' :
                                          'bg-green-500'
                                        )}
                                        style={{
                                          width: `${Math.max(5, (bookedSpots / classItem.capacity) * 100)}%`
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Details Modal */}
      <Dialog open={classDetailsOpen} onOpenChange={setClassDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Class Details</DialogTitle>
                <DialogDescription>
                  Complete class information and student reservations
                </DialogDescription>
              </div>
              {selectedClass && (
                <div className="flex space-x-2">
                  <ReservationManager
                    classId={selectedClass.id}
                    currentCapacity={selectedClass.capacity}
                    currentBookings={selectedClass.capacity - selectedClass.availableSpots}
                    onReservationCreated={() => {
                      // Reload class details
                      viewClassDetails(selectedClass.id)
                      // Reload weekly schedule
                      loadWeeklySchedule(currentWeek)
                    }}
                  />
                  <CapacityManager
                    classId={selectedClass.id}
                    currentCapacity={selectedClass.capacity}
                    currentBookings={selectedClass.capacity - selectedClass.availableSpots}
                    maxCapacity={selectedClass.classType.maxCapacity}
                    waitlistCount={selectedClass.waitlistCount || 0}
                    onCapacityChanged={() => {
                      // Reload class details
                      viewClassDetails(selectedClass.id)
                      // Reload weekly schedule
                      loadWeeklySchedule(currentWeek)
                    }}
                  />
                  <ClassCompletionManager
                    classId={selectedClass.id}
                    classStatus={selectedClass.status}
                    checkedInStudents={selectedClass.reservations.filter(r => r.status === 'CHECKED_IN').map(r => ({
                      id: r.student.id,
                      name: r.student.name,
                      email: r.student.email
                    }))}
                    confirmedStudents={selectedClass.reservations.filter(r => r.status === 'CONFIRMED').map(r => ({
                      id: r.student.id,
                      name: r.student.name,
                      email: r.student.email
                    }))}
                    noShowStudents={selectedClass.reservations.filter(r => r.status === 'NO_SHOW').map(r => ({
                      id: r.student.id,
                      name: r.student.name,
                      email: r.student.email
                    }))}
                    onClassCompleted={() => {
                      // Reload class details
                      viewClassDetails(selectedClass.id)
                      // Reload weekly schedule
                      loadWeeklySchedule(currentWeek)
                    }}
                  />
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Class Type</Label>
                  <p className="text-sm">{selectedClass.classType.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div>
                    <Badge className={getStatusColor(selectedClass.status)}>
                      {selectedClass.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date & Time</Label>
                  <p className="text-sm">
                    {format(new Date(selectedClass.startsAt), 'PPP')} at {formatTime(selectedClass.startsAt)} - {formatTime(selectedClass.endsAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <p className="text-sm">{selectedClass.classType.durationMinutes} minutes</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Instructor</Label>
                  <p className="text-sm">{selectedClass.instructor ? selectedClass.instructor.name : 'No instructor assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm">{selectedClass.location.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Capacity</Label>
                  <p className="text-sm">{selectedClass.availableSpots} available / {selectedClass.capacity} total</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Price</Label>
                  <p className="text-sm">${selectedClass.price}</p>
                </div>
              </div>

              {selectedClass.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm mt-1">{selectedClass.notes}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Student Reservations ({selectedClass.reservations.length})</Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {selectedClass.reservations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No reservations yet</p>
                    ) : (
                      selectedClass.reservations.map((reservation) => (
                        <Card key={reservation.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{reservation.student.name}</p>
                                <p className="text-xs text-muted-foreground">{reservation.student.email}</p>
                              </div>
                              <Badge variant="outline">
                                {reservation.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Waitlist Section */}
                {selectedClass.waitlist && selectedClass.waitlist.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Waitlist ({selectedClass.waitlist.length})</Label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                      {selectedClass.waitlist.map((waitlistEntry) => (
                        <Card key={waitlistEntry.id} className="bg-orange-50 border-orange-200">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{waitlistEntry.student.name}</p>
                                <p className="text-xs text-muted-foreground">{waitlistEntry.student.email}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="text-orange-700 border-orange-300">
                                  #{waitlistEntry.priority}
                                </Badge>
                                <p className="text-xs text-orange-600 mt-1">
                                  {format(new Date(waitlistEntry.createdAt), 'MMM dd')}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}