'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { InstructorCalendar } from '@/components/ui/instructor-calendar'
import { StudentRoster } from '@/components/ui/student-roster'
import { AttendanceManager } from '@/components/ui/attendance-manager'
import {
  Calendar,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  Bell,
  TrendingUp,
  BookOpen,
  Download,
  Filter,
  CheckCircle,
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'

export default function InstructorSchedulePage() {
  const [scheduleData, setScheduleData] = useState<any>(null)
  const [rosterData, setRosterData] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week')
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek
    return {
      start: new Date(today.setDate(diff)),
      end: new Date(today.setDate(diff + 6)),
    }
  })

  const fetchSchedule = async (start?: Date, end?: Date, view?: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (start) params.append('startDate', format(start, 'yyyy-MM-dd'))
      if (end) params.append('endDate', format(end, 'yyyy-MM-dd'))
      if (view) params.append('view', view)

      const response = await fetch(`/api/instructor/schedule?${params}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You must be logged in as an instructor to view this page')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setScheduleData(data)
    } catch (err: any) {
      console.error('Failed to fetch schedule:', err)
      setError(err.message || 'Failed to fetch schedule data')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoster = async (classId: string) => {
    try {
      const response = await fetch(`/api/instructor/roster/${classId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setRosterData(data)
      setSelectedClass(classId)
    } catch (err: any) {
      console.error('Failed to fetch roster:', err)
      setError(err.message || 'Failed to fetch roster data')
    }
  }

  const updateNote = async (reservationId: string, notes: string) => {
    try {
      const response = await fetch('/api/instructor/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh roster data
      if (selectedClass) {
        await fetchRoster(selectedClass)
      }
    } catch (err: any) {
      console.error('Failed to update note:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchSchedule(dateRange.start, dateRange.end, currentView)
  }, [])

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
    fetchSchedule(start, end, currentView)
  }

  const handleViewChange = (view: 'day' | 'week' | 'month') => {
    setCurrentView(view)
    fetchSchedule(dateRange.start, dateRange.end, view)
  }

  const getUpcomingChanges = () => {
    if (!scheduleData) return []
    return scheduleData.recentChanges.filter((change: any) => {
      const changeDate = new Date(change.startsAt)
      return changeDate > new Date()
    })
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'filled_up':
        return <Users className="w-4 h-4 text-orange-500" />
      default:
        return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">Error: {error}</span>
            </div>
            <Button
              onClick={() => fetchSchedule(dateRange.start, dateRange.end, currentView)}
              variant="outline"
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const upcomingChanges = getUpcomingChanges()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-muted-foreground">
            Manage your classes and view student rosters
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchSchedule(dateRange.start, dateRange.end, currentView)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts for Recent Changes */}
      {upcomingChanges.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Bell className="w-5 h-5" />
              Schedule Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingChanges.slice(0, 3).map((change: any) => (
                <div key={change.id} className="flex items-center gap-3 text-sm">
                  {getChangeTypeIcon(change.changeType)}
                  <span className="font-medium">{change.classType}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(change.startsAt), 'MMM d, HH:mm')}
                  </span>
                  <span className="text-orange-700">
                    {change.changeType === 'cancelled' ? 'Cancelled' :
                     change.changeType === 'filled_up' ? 'Class is now full' : 'Updated'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Upcoming Classes</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center space-x-2" disabled={!selectedClass}>
            <CheckCircle className="h-4 w-4" />
            <span>Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="roster" className="flex items-center space-x-2" disabled={!selectedClass}>
            <Users className="h-4 w-4" />
            <span>Student Roster</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <InstructorCalendar
            data={scheduleData}
            onDateRangeChange={handleDateRangeChange}
            onViewChange={handleViewChange}
          />

          {/* Quick Class Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Select a class from your schedule to view the student roster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleData.calendarEvents.slice(0, 6).map((classItem: any) => (
                  <Card key={classItem.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => fetchRoster(classItem.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{classItem.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          classItem.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          classItem.status === 'FULL' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {classItem.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(classItem.start), 'MMM d, HH:mm')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {classItem.bookedStudents}/{classItem.capacity} students
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes (Next 7 Days)</CardTitle>
              <CardDescription>
                Your upcoming teaching schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduleData.upcomingClasses.map((classItem: any) => (
                  <div key={classItem.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{classItem.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          classItem.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          classItem.status === 'FULL' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {classItem.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(classItem.start), 'EEEE, MMMM d • HH:mm')} - {format(new Date(classItem.end), 'HH:mm')}
                        <span className="ml-3">{classItem.location.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{classItem.bookedStudents}/{classItem.capacity}</div>
                      <div className="text-sm text-muted-foreground">students</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => fetchRoster(classItem.id)}
                    >
                      View Roster
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          {selectedClass ? (
            <AttendanceManager
              classId={selectedClass}
              onAttendanceUpdate={() => {
                // Refresh schedule data when attendance changes
                fetchSchedule(dateRange.start, dateRange.end, currentView)
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Class Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a class from your schedule to manage attendance
                </p>
                <Button onClick={() => setSelectedClass(null)}>
                  Back to Schedule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roster" className="space-y-6">
          {rosterData ? (
            <StudentRoster data={rosterData} onUpdateNote={updateNote} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Class Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a class from your schedule to view the student roster
                </p>
                <Button onClick={() => setSelectedClass(null)}>
                  Back to Schedule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}