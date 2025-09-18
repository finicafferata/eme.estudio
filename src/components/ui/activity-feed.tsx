'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  UserPlus,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'BOOKING' | 'CANCELLATION' | 'CHECKIN' | 'NOSHOW' | 'WAITLIST_JOIN' | 'WAITLIST_PROMOTE'
  timestamp: string
  student: {
    id: string
    name: string
    email: string
  }
  class: {
    id: string
    name: string
    startsAt: string
    location: string
  }
  metadata?: {
    reason?: string
    packageUsed?: boolean
    overrideUsed?: boolean
    waitlistPosition?: number
  }
}

interface ActivityStats {
  todayBookings: number
  todayCancellations: number
  activeUsers: number
  popularTimeSlots: {
    timeSlot: string
    bookings: number
  }[]
  fastFillingClasses: {
    classId: string
    className: string
    startsAt: string
    capacity: number
    booked: number
    fillRate: number
  }[]
}

interface ActivityFeedProps {
  maxItems?: number
  refreshInterval?: number
  showStats?: boolean
  className?: string
}

export function ActivityFeed({
  maxItems = 50,
  refreshInterval = 30000, // 30 seconds
  showStats = true,
  className
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadActivity = async () => {
    try {
      const response = await fetch(`/api/analytics/activity?limit=${maxItems}&filter=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
        if (showStats) {
          setStats(data.stats || null)
        }
      }
    } catch (error) {
      console.error('Error loading activity:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivity()
  }, [loadActivity, filter, maxItems])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(loadActivity, refreshInterval)
    return () => clearInterval(interval)
  }, [loadActivity, autoRefresh, refreshInterval])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return <UserPlus className="h-4 w-4 text-green-600" />
      case 'CANCELLATION':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'CHECKIN':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'NOSHOW':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'WAITLIST_JOIN':
        return <Clock className="h-4 w-4 text-purple-600" />
      case 'WAITLIST_PROMOTE':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return 'bg-green-100 text-green-800'
      case 'CANCELLATION':
        return 'bg-red-100 text-red-800'
      case 'CHECKIN':
        return 'bg-blue-100 text-blue-800'
      case 'NOSHOW':
        return 'bg-orange-100 text-orange-800'
      case 'WAITLIST_JOIN':
        return 'bg-purple-100 text-purple-800'
      case 'WAITLIST_PROMOTE':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatActivityText = (activity: ActivityItem) => {
    const studentName = activity.student.name.split(' ')[0] // First name only
    const className = activity.class.name
    const timeUntilClass = formatDistanceToNow(new Date(activity.class.startsAt), { addSuffix: true })

    switch (activity.type) {
      case 'BOOKING':
        return (
          <div>
            <span className="font-medium">{studentName}</span> booked{' '}
            <span className="font-medium">{className}</span>
            {activity.metadata?.packageUsed && (
              <Badge variant="outline" className="ml-1 text-xs">Package</Badge>
            )}
          </div>
        )
      case 'CANCELLATION':
        return (
          <div>
            <span className="font-medium">{studentName}</span> cancelled{' '}
            <span className="font-medium">{className}</span>
            {activity.metadata?.overrideUsed && (
              <Badge variant="outline" className="ml-1 text-xs text-orange-600">Override</Badge>
            )}
          </div>
        )
      case 'CHECKIN':
        return (
          <div>
            <span className="font-medium">{studentName}</span> checked in to{' '}
            <span className="font-medium">{className}</span>
          </div>
        )
      case 'NOSHOW':
        return (
          <div>
            <span className="font-medium">{studentName}</span> no-show for{' '}
            <span className="font-medium">{className}</span>
          </div>
        )
      case 'WAITLIST_JOIN':
        return (
          <div>
            <span className="font-medium">{studentName}</span> joined waitlist for{' '}
            <span className="font-medium">{className}</span>
            {activity.metadata?.waitlistPosition && (
              <Badge variant="outline" className="ml-1 text-xs">
                Position {activity.metadata.waitlistPosition}
              </Badge>
            )}
          </div>
        )
      case 'WAITLIST_PROMOTE':
        return (
          <div>
            <span className="font-medium">{studentName}</span> promoted from waitlist to{' '}
            <span className="font-medium">{className}</span>
          </div>
        )
      default:
        return `${studentName} - ${className}`
    }
  }

  if (loading && activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      {showStats && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-4 w-4 text-green-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Today&apos;s Bookings</p>
                  <p className="text-2xl font-bold text-green-600">{stats.todayBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Today&apos;s Cancellations</p>
                  <p className="text-2xl font-bold text-red-600">{stats.todayCancellations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Active Users</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-orange-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium leading-none">Fast Filling</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.fastFillingClasses.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Live Activity Feed</span>
                {autoRefresh && (
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </CardTitle>
              <CardDescription>
                Real-time booking activity and student actions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bookings">Bookings</SelectItem>
                  <SelectItem value="cancellations">Cancellations</SelectItem>
                  <SelectItem value="checkins">Check-ins</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {formatActivityText(activity)}
                      </div>
                      <Badge className={getActivityColor(activity.type)} variant="secondary">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(activity.class.startsAt), 'MMM dd, HH:mm')}</span>
                      <span>•</span>
                      <span>{activity.class.location}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Popular Time Slots */}
      {showStats && stats && stats.popularTimeSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Time Slots</CardTitle>
            <CardDescription>
              Most booked time slots this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.popularTimeSlots.slice(0, 5).map((slot, index) => (
                <div key={slot.timeSlot} className="flex items-center justify-between p-2 rounded">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{slot.timeSlot}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{slot.bookings} bookings</span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (slot.bookings / Math.max(...stats.popularTimeSlots.map(s => s.bookings))) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fast Filling Classes */}
      {showStats && stats && stats.fastFillingClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fast Filling Classes</CardTitle>
            <CardDescription>
              Classes filling up quickly - may need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.fastFillingClasses.map((classInfo) => (
                <div key={classInfo.classId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{classInfo.className}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(classInfo.startsAt), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{classInfo.booked}/{classInfo.capacity}</div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round(classInfo.fillRate)}% full
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}