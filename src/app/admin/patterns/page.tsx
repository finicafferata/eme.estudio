'use client'

import { useState, useEffect } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { format } from 'date-fns'
import {
  Calendar as CalendarIcon,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Edit,
  Trash2,
  Eye,
  Clock,
  Users,
  MapPin,
  User,
  Calendar1
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface RecurringPattern {
  id: string
  name: string
  dayOfWeek: number
  dayName: string
  startTime: string
  durationMinutes: number
  endTime: string
  capacity: number
  price: number
  isActive: boolean
  validFrom: string
  validUntil: string | null
  createdAt: string
  classType: {
    id: string
    name: string
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
    capacity: number
  }
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
}

// EME Studio Template Patterns
const PATTERN_TEMPLATES = {
  monday_morning_intensivo: {
    name: 'Monday Morning Intensivo',
    dayOfWeek: 1,
    startTime: '10:00',
    durationMinutes: 150,
    defaultClassName: 'Intensivo'
  },
  tuesday_morning_intensivo: {
    name: 'Tuesday Morning Intensivo',
    dayOfWeek: 2,
    startTime: '10:00',
    durationMinutes: 150,
    defaultClassName: 'Intensivo'
  },
  tuesday_afternoon: {
    name: 'Tuesday Afternoon',
    dayOfWeek: 2,
    startTime: '15:00',
    durationMinutes: 150,
    defaultClassName: 'Recurrente'
  },
  wednesday_morning_intensivo: {
    name: 'Wednesday Morning Intensivo',
    dayOfWeek: 3,
    startTime: '10:00',
    durationMinutes: 150,
    defaultClassName: 'Intensivo'
  },
  wednesday_evening: {
    name: 'Wednesday Evening',
    dayOfWeek: 3,
    startTime: '18:00',
    durationMinutes: 150,
    defaultClassName: 'Recurrente'
  },
  thursday_morning_intensivo: {
    name: 'Thursday Morning Intensivo',
    dayOfWeek: 4,
    startTime: '10:00',
    durationMinutes: 150,
    defaultClassName: 'Intensivo'
  },
  thursday_afternoon: {
    name: 'Thursday Afternoon',
    dayOfWeek: 4,
    startTime: '15:00',
    durationMinutes: 150,
    defaultClassName: 'Recurrente'
  },
  friday_morning_intensivo: {
    name: 'Friday Morning Intensivo',
    dayOfWeek: 5,
    startTime: '10:00',
    durationMinutes: 150,
    defaultClassName: 'Intensivo'
  },
  friday_afternoon: {
    name: 'Friday Afternoon',
    dayOfWeek: 5,
    startTime: '14:00',
    durationMinutes: 150,
    defaultClassName: 'Recurrente'
  },
  saturday_morning_intensivo: {
    name: 'Saturday Morning Intensivo',
    dayOfWeek: 6,
    startTime: '10:00',
    durationMinutes: 150,
    defaultClassName: 'Intensivo'
  }
}

export default function RecurringPatternsPage() {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([])
  const [classOptions, setClassOptions] = useState<ClassOptions | null>(null)
  const [loading, setLoading] = useState(true)

  // Create Pattern Modal State
  const [createPatternOpen, setCreatePatternOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [patternName, setPatternName] = useState('')
  const [classTypeId, setClassTypeId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [startTime, setStartTime] = useState('10:00')
  const [durationMinutes, setDurationMinutes] = useState(150)
  const [capacity, setCapacity] = useState(6)
  const [price, setPrice] = useState('')
  const [validFrom, setValidFrom] = useState<Date>(new Date())
  const [validUntil, setValidUntil] = useState<Date>()
  const [generateWeeks, setGenerateWeeks] = useState(4)
  const [skipHolidays, setSkipHolidays] = useState(true)

  // Pattern Details Modal State
  const [patternDetailsOpen, setPatternDetailsOpen] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<RecurringPattern | null>(null)

  const loadPatterns = async () => {
    try {
      const response = await fetch('/api/patterns')
      if (response.ok) {
        const data = await response.json()
        setPatterns(data.patterns)
      }
    } catch (error) {
      console.error('Error loading patterns:', error)
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

  const handleCreatePattern = async () => {
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patternName,
          classTypeId,
          instructorId: instructorId === 'none' || !instructorId ? null : instructorId,
          locationId,
          dayOfWeek,
          startTime,
          durationMinutes,
          capacity,
          price: parseFloat(price),
          validFrom: validFrom.toISOString(),
          validUntil: validUntil?.toISOString(),
          generateWeeks,
          skipHolidays
        })
      })

      if (response.ok) {
        setCreatePatternOpen(false)
        resetCreatePatternForm()
        loadPatterns()
      }
    } catch (error) {
      console.error('Error creating pattern:', error)
    }
  }

  const resetCreatePatternForm = () => {
    setSelectedTemplate('')
    setPatternName('')
    setClassTypeId('')
    setInstructorId('')
    setLocationId('')
    setDayOfWeek(1)
    setStartTime('10:00')
    setDurationMinutes(150)
    setCapacity(6)
    setPrice('')
    setValidFrom(new Date())
    setValidUntil(undefined)
    setGenerateWeeks(4)
    setSkipHolidays(true)
  }

  const handleTogglePattern = async (patternId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/patterns/${patternId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        loadPatterns()
      }
    } catch (error) {
      console.error('Error toggling pattern:', error)
    }
  }

  const handleGenerateClasses = async (patternId: string, weeks: number = 4) => {
    try {
      const response = await fetch(`/api/patterns/${patternId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeksAhead: weeks,
          skipHolidays: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Generated ${data.generatedClasses} classes`)
      }
    } catch (error) {
      console.error('Error generating classes:', error)
    }
  }

  const handleDeletePattern = async (patternId: string) => {
    if (!confirm('Are you sure you want to delete this pattern? This will also delete future classes without reservations.')) {
      return
    }

    try {
      const response = await fetch(`/api/patterns/${patternId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadPatterns()
      }
    } catch (error) {
      console.error('Error deleting pattern:', error)
    }
  }

  const applyTemplate = (templateKey: string) => {
    const template = PATTERN_TEMPLATES[templateKey as keyof typeof PATTERN_TEMPLATES]
    if (template) {
      setPatternName(template.name)
      setDayOfWeek(template.dayOfWeek)
      setStartTime(template.startTime)
      setDurationMinutes(template.durationMinutes)

      // Try to find matching class type
      const matchingClassType = classOptions?.classTypes.find(ct =>
        ct.name.toLowerCase().includes(template.defaultClassName.toLowerCase())
      )
      if (matchingClassType) {
        setClassTypeId(matchingClassType.id)
        setPrice(matchingClassType.defaultPrice.toString())
      }
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadPatterns(), loadClassOptions()])
      setLoading(false)
    }
    loadData()
  }, [])

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Patterns</h1>
          <p className="text-muted-foreground">Create templates and auto-generate classes for weeks ahead</p>
        </div>
        <Dialog open={createPatternOpen} onOpenChange={setCreatePatternOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Pattern
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Create Recurring Pattern</DialogTitle>
              <DialogDescription>
                Set up a template like &quot;Monday 10am Intensivo with Male&quot; and auto-generate classes
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Quick Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={(value) => {
                  setSelectedTemplate(value)
                  if (value && value !== 'custom') applyTemplate(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template or create custom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Pattern</SelectItem>
                    {Object.entries(PATTERN_TEMPLATES).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pattern Name</Label>
                <Input
                  placeholder="e.g., Monday 10am Intensivo with Male"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek.toString()} onValueChange={(value) => setDayOfWeek(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 150)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    value={new Date(new Date(`1970-01-01T${startTime}:00`).getTime() + durationMinutes * 60000).toTimeString().slice(0, 5)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-3 gap-4">
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    placeholder="Class price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !validFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {validFrom ? format(validFrom, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={validFrom}
                        onSelect={(date) => date && setValidFrom(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Valid Until (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !validUntil && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {validUntil ? format(validUntil, "PPP") : <span>No end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={validUntil}
                        onSelect={setValidUntil}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Generate Classes (weeks ahead)</Label>
                  <Select value={generateWeeks.toString()} onValueChange={(value) => setGenerateWeeks(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 weeks</SelectItem>
                      <SelectItem value="6">6 weeks</SelectItem>
                      <SelectItem value="8">8 weeks</SelectItem>
                      <SelectItem value="12">12 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Skip Holidays</Label>
                  <Select value={skipHolidays.toString()} onValueChange={(value) => setSkipHolidays(value === 'true')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes, skip holidays</SelectItem>
                      <SelectItem value="false">No, include all dates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreatePatternOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePattern}
                  disabled={!patternName || !classTypeId || !locationId || !price}
                >
                  Create Pattern & Generate Classes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Patterns List */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Patterns</CardTitle>
          <CardDescription>
            Manage your class templates and automatically generate future classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pattern Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Class Type</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patterns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No recurring patterns created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  patterns.map((pattern) => (
                    <TableRow key={pattern.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pattern.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Valid from {format(new Date(pattern.validFrom), 'MMM dd, yyyy')}
                            {pattern.validUntil && ` until ${format(new Date(pattern.validUntil), 'MMM dd, yyyy')}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar1 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{pattern.dayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {pattern.startTime} - {pattern.endTime}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pattern.classType.name}</div>
                          <div className="text-sm text-muted-foreground">{pattern.durationMinutes}min</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{pattern.instructor ? pattern.instructor.name : 'No instructor'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{pattern.location.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(pattern.isActive)}>
                          {pattern.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePattern(pattern.id, pattern.isActive)}
                            title={pattern.isActive ? 'Pause pattern' : 'Resume pattern'}
                          >
                            {pattern.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateClasses(pattern.id)}
                            title="Generate 4 more weeks"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePattern(pattern.id)}
                            title="Delete pattern"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}