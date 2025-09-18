'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  Mail,
  Package
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isPast, isFuture } from 'date-fns'

interface InstructorCalendarProps {
  data: {
    calendarEvents: any[]
    upcomingClasses: any[]
    recentChanges: any[]
    dateRange: { start: Date; end: Date; view: string }
    summary: any
  }
  onDateRangeChange: (start: Date, end: Date) => void
  onViewChange: (view: 'day' | 'week' | 'month') => void
}

export function InstructorCalendar({ data, onDateRangeChange, onViewChange }: InstructorCalendarProps) {
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>(data.dateRange.view as any || 'week')
  const [selectedClass, setSelectedClass] = useState<any>(null)

  const startDate = new Date(data.dateRange.start)
  const endDate = new Date(data.dateRange.end)

  const getStatusColor = (status: string, bookedStudents?: number, capacity?: number) => {
    // For completed classes, we don't need to show availability
    if (status === 'COMPLETED') {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    // For active classes, prioritize capacity over generic status
    if (bookedStudents !== undefined && capacity !== undefined) {
      if (bookedStudents >= capacity) {
        return 'bg-red-100 text-red-800 border-red-200' // FULL
      } else if (bookedStudents > 0) {
        return 'bg-green-100 text-green-800 border-green-200' // HAS_REGISTRATIONS
      }
    }

    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusDisplay = (status: string, bookedStudents?: number, capacity?: number) => {
    // For completed classes, just show completed
    if (status === 'COMPLETED') {
      return { icon: <CheckCircle className="w-3 h-3" />, label: 'COMPLETED' }
    }

    // For active classes, prioritize meaningful information
    if (bookedStudents !== undefined && capacity !== undefined) {
      if (bookedStudents >= capacity) {
        return { icon: <AlertCircle className="w-3 h-3" />, label: 'FULL' }
      } else if (bookedStudents > 0) {
        return { icon: <Users className="w-3 h-3" />, label: `${bookedStudents} REGISTERED` }
      } else {
        return { icon: <Clock className="w-3 h-3" />, label: 'AVAILABLE' }
      }
    }

    switch (status) {
      case 'SCHEDULED':
        return { icon: <Clock className="w-3 h-3" />, label: 'SCHEDULED' }
      case 'IN_PROGRESS':
        return { icon: <CheckCircle className="w-3 h-3" />, label: 'IN PROGRESS' }
      case 'CANCELLED':
        return { icon: <XCircle className="w-3 h-3" />, label: 'CANCELLED' }
      default:
        return { icon: <Clock className="w-3 h-3" />, label: 'SCHEDULED' }
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    let newStart: Date
    let newEnd: Date

    if (currentView === 'day') {
      newStart = addDays(startDate, direction === 'next' ? 1 : -1)
      newEnd = new Date(newStart)
    } else if (currentView === 'week') {
      const adjustment = direction === 'next' ? 7 : -7
      newStart = addDays(startDate, adjustment)
      newEnd = addDays(endDate, adjustment)
    } else { // month
      const adjustment = direction === 'next' ? 1 : -1
      newStart = new Date(startDate.getFullYear(), startDate.getMonth() + adjustment, 1)
      newEnd = new Date(startDate.getFullYear(), startDate.getMonth() + adjustment + 1, 0)
    }

    onDateRangeChange(newStart, newEnd)
  }

  const changeView = (view: 'day' | 'week' | 'month') => {
    setCurrentView(view)
    onViewChange(view)
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 }) // Sunday
    const weekEnd = endOfWeek(startDate, { weekStartsOn: 0 })
    const days = []

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i)
      const dayClasses = data.calendarEvents.filter(event =>
        isSameDay(new Date(event.start), day)
      )

      days.push(
        <div key={day.toISOString()} className="border-r last:border-r-0 min-h-32">
          <div className={`p-2 border-b font-medium text-sm ${
            isToday(day) ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-700'
          }`}>
            <div>{format(day, 'EEE')}</div>
            <div className={`text-lg ${isToday(day) ? 'font-bold' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
          <div className="p-1 space-y-1">
            {dayClasses.map(classItem => (
              <Dialog key={classItem.id}>
                <DialogTrigger asChild>
                  <div
                    className={`p-2 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(classItem.status, classItem.bookedStudents, classItem.capacity)}`}
                    onClick={() => setSelectedClass(classItem)}
                  >
                    <div className="font-medium truncate">{classItem.title}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(classItem.start), 'HH:mm')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="truncate" title="Click to see registered students">
                        {classItem.bookedStudents}/{classItem.capacity}
                      </span>
                    </div>
                  </div>
                </DialogTrigger>
                <ClassDetailsDialog classItem={classItem} />
              </Dialog>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
        {days}
      </div>
    )
  }

  const renderDayView = () => {
    const dayClasses = data.calendarEvents.filter(event =>
      isSameDay(new Date(event.start), startDate)
    )

    return (
      <div className="space-y-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold">
            {format(startDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'} scheduled
          </p>
        </div>

        <div className="space-y-3">
          {dayClasses.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No classes scheduled for this day</p>
              </CardContent>
            </Card>
          ) : (
            dayClasses.map(classItem => (
              <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{classItem.title}</h4>
                        {classItem.status === 'COMPLETED' && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            COMPLETED
                          </Badge>
                        )}
                        {classItem.status === 'CANCELLED' && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <XCircle className="w-3 h-3 mr-1" />
                            CANCELLED
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(classItem.start), 'HH:mm')} - {format(new Date(classItem.end), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {classItem.location.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span className="cursor-pointer hover:underline" title="Click Details to see registered students">
                            {classItem.bookedStudents}/{classItem.capacity} students
                            {classItem.bookedStudents > 0 && (
                              <span className="text-green-600 ml-1">• {classItem.bookedStudents} registered</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          ${classItem.price}
                        </div>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <ClassDetailsDialog classItem={classItem} />
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-lg font-semibold">
            {currentView === 'week' && (
              `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
            )}
            {currentView === 'day' && format(startDate, 'EEEE, MMMM d, yyyy')}
            {currentView === 'month' && format(startDate, 'MMMM yyyy')}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={currentView === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeView('day')}
          >
            Day
          </Button>
          <Button
            variant={currentView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeView('week')}
          >
            Week
          </Button>
          <Button
            variant={currentView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeView('month')}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <Card>
        <CardContent className="p-6">
          {currentView === 'week' && renderWeekView()}
          {currentView === 'day' && renderDayView()}
          {currentView === 'month' && (
            <div className="text-center p-8 text-muted-foreground">
              Month view coming soon...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.totalClasses}</div>
            <div className="text-sm text-muted-foreground">Total Classes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.totalStudents}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.averageStudentsPerClass}</div>
            <div className="text-sm text-muted-foreground">Avg Students/Class</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.cancelledClasses}</div>
            <div className="text-sm text-muted-foreground">Cancelled</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClassDetailsDialog({ classItem }: { classItem: any }) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {classItem.title}
          <Badge className={`${
            classItem.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
            classItem.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            classItem.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {classItem.status}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {format(new Date(classItem.start), 'EEEE, MMMM d, yyyy • HH:mm')} - {format(new Date(classItem.end), 'HH:mm')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Class Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Location</span>
            </div>
            <div className="pl-6">
              <div>{classItem.location.name}</div>
              <div className="text-sm text-muted-foreground">{classItem.location.address}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Capacity</span>
            </div>
            <div className="pl-6">
              <div>{classItem.bookedStudents} / {classItem.capacity} students</div>
              <div className="text-sm text-muted-foreground">
                {classItem.availableSpots} spots available
              </div>
            </div>
          </div>
        </div>

        {/* Student List */}
        {classItem.students && classItem.students.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Enrolled Students ({classItem.students.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {classItem.students.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {student.email}
                      </span>
                      {student.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {student.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`
                    ${student.status === 'CONFIRMED' ? 'text-blue-700' :
                      student.status === 'CHECKED_IN' ? 'text-green-700' :
                      'text-gray-700'}
                  `}>
                    {student.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waitlist */}
        {classItem.waitlist && classItem.waitlist.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Waitlist ({classItem.waitlist.length})
            </h4>
            <div className="space-y-2">
              {classItem.waitlist.map((waitItem: any) => (
                <div key={waitItem.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-medium">{waitItem.name}</div>
                    <div className="text-sm text-muted-foreground">{waitItem.email}</div>
                  </div>
                  <Badge variant="outline" className="text-yellow-700">
                    Priority {waitItem.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {classItem.notes && (
          <div>
            <h4 className="font-medium mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
              {classItem.notes}
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  )
}