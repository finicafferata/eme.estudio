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
import { Input } from '@/components/ui/input'
import { StudentAnalyticsCharts } from '@/components/ui/student-analytics-charts'
import {
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Package
} from 'lucide-react'
import { subDays, format } from 'date-fns'

interface DateRange {
  from?: Date
  to?: Date
}

export default function StudentAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState('90')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'))
      }
      if (dateRange?.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'))
      }
      if (!dateRange?.from && !dateRange?.to) {
        params.append('timeframe', timeframe)
      }

      const response = await fetch(`/api/analytics/students?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setAnalyticsData(data)
    } catch (err: any) {
      console.error('Failed to fetch student analytics:', err)
      setError(err.message || 'Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe, dateRange])

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
    // Clear custom date range when selecting predefined timeframe
    if (value !== 'custom') {
      setDateRange({
        from: subDays(new Date(), parseInt(value)),
        to: new Date(),
      })
    }
  }

  const generateInsights = (data: any) => {
    if (!data) return []

    const insights = []

    // High no-show rate insight
    if (data.overallMetrics.averageNoShowRate > 15) {
      insights.push({
        type: 'warning',
        title: 'High No-Show Rate Detected',
        message: `Average no-show rate is ${data.overallMetrics.averageNoShowRate.toFixed(1)}%. Consider implementing reminder systems or penalty policies.`,
        icon: AlertTriangle,
      })
    }

    // Low engagement insight
    if (data.studentsNeedingEngagement.length > data.studentsWithActivity * 0.3) {
      insights.push({
        type: 'warning',
        title: 'Many Students Need Engagement',
        message: `${data.studentsNeedingEngagement.length} students need attention. Consider personalized outreach campaigns.`,
        icon: Users,
      })
    }

    // Package completion insight
    if (data.packageCompletionAnalytics.wasteRate > 25) {
      insights.push({
        type: 'error',
        title: 'High Package Waste Rate',
        message: `${data.packageCompletionAnalytics.wasteRate.toFixed(1)}% of credits go unused. Review package structures and expiration policies.`,
        icon: Package,
      })
    }

    // Positive insights
    if (data.overallMetrics.averageAttendanceRate > 85) {
      insights.push({
        type: 'success',
        title: 'Excellent Attendance Rate',
        message: `Average attendance rate of ${data.overallMetrics.averageAttendanceRate.toFixed(1)}% shows strong student engagement.`,
        icon: UserCheck,
      })
    }

    return insights
  }

  const exportData = () => {
    if (!analyticsData) return

    const csvData = analyticsData.studentAnalytics.map((student: any) => ({
      'Student Name': student.student.name,
      'Email': student.student.email,
      'Total Reservations': student.totalReservations,
      'Attendance Rate (%)': student.attendanceRate,
      'No-Show Rate (%)': student.noShowRate,
      'Engagement Score': student.engagementScore,
      'Days Since Last Booking': student.daysSinceLastBooking,
      'Favorite Class Type': student.favoriteClassType,
      'Package Completion Rate (%)': student.packageUsage.completionRate,
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">Error loading analytics: {error}</span>
            </div>
            <Button
              onClick={fetchAnalytics}
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

  const insights = generateInsights(analyticsData)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of student attendance, engagement, and behavior patterns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
              className="w-36"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
              className="w-36"
            />
          </div>
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <Card key={index} className={`
              ${insight.type === 'success' ? 'border-green-200 bg-green-50' : ''}
              ${insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
              ${insight.type === 'error' ? 'border-red-200 bg-red-50' : ''}
            `}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <insight.icon className={`h-5 w-5 mt-0.5 ${
                    insight.type === 'success' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                  <div>
                    <h4 className={`font-medium ${
                      insight.type === 'success' ? 'text-green-900' :
                      insight.type === 'warning' ? 'text-yellow-900' :
                      'text-red-900'
                    }`}>
                      {insight.title}
                    </h4>
                    <p className={`text-sm ${
                      insight.type === 'success' ? 'text-green-800' :
                      insight.type === 'warning' ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Engagement</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Packages</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Trends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <StudentAnalyticsCharts data={analyticsData} />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-6">
            {/* Students Needing Engagement - Full view */}
            <Card>
              <CardHeader>
                <CardTitle>Students Requiring Attention</CardTitle>
                <CardDescription>
                  Complete list of students who may benefit from additional outreach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analyticsData.studentsNeedingEngagement.map((student: any) => (
                    <div key={student.student.id} className="p-4 rounded-lg border bg-white hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{student.student.name}</h4>
                          <p className="text-sm text-muted-foreground">{student.student.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{student.engagementScore}</div>
                          <div className="text-xs text-muted-foreground">Engagement Score</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Attendance:</span>
                          <div className="font-medium">{student.attendanceRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">No-shows:</span>
                          <div className="font-medium">{student.noShowRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last booking:</span>
                          <div className="font-medium">{student.daysSinceLastBooking}d ago</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total classes:</span>
                          <div className="font-medium">{student.totalReservations}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Package Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {analyticsData.packageCompletionAnalytics.completedPackages}
                      </div>
                      <div className="text-sm text-green-700">Completed</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {analyticsData.packageCompletionAnalytics.activePackages}
                      </div>
                      <div className="text-sm text-blue-700">Active</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {analyticsData.packageCompletionAnalytics.expiredPackages}
                      </div>
                      <div className="text-sm text-red-700">Expired</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Credit Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Credits Used</span>
                    <span className="font-bold">
                      {analyticsData.packageCompletionAnalytics.creditsUsed} / {analyticsData.packageCompletionAnalytics.creditsIssued}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Utilization Rate</span>
                    <span className="font-bold">
                      {analyticsData.packageCompletionAnalytics.averageCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Waste Rate</span>
                    <span className="font-bold text-red-600">
                      {analyticsData.packageCompletionAnalytics.wasteRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Period Summary</CardTitle>
                <CardDescription>
                  Analytics for {analyticsData.dateRange.start && format(new Date(analyticsData.dateRange.start), 'MMM dd, yyyy')} - {analyticsData.dateRange.end && format(new Date(analyticsData.dateRange.end), 'MMM dd, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analyticsData.studentsWithActivity}</div>
                    <div className="text-sm text-muted-foreground">Active Students</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analyticsData.overallMetrics.totalReservations}</div>
                    <div className="text-sm text-muted-foreground">Total Reservations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analyticsData.overallMetrics.averageAttendanceRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Avg Attendance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analyticsData.overallMetrics.averageEngagementScore}</div>
                    <div className="text-sm text-muted-foreground">Avg Engagement</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}