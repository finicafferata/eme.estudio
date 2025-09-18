'use client'

import React, { useState, useEffect } from 'react'
import { UtilizationCharts } from '@/components/ui/utilization-charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download, RefreshCw, TrendingUp, Calendar, Clock,
  Users, DollarSign, AlertCircle, ChevronRight, BarChart2
} from 'lucide-react'
import { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export default function ClassUtilizationPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [classTypeId, setClassTypeId] = useState<string>('all')
  const [classTypes, setClassTypes] = useState<any[]>([])
  const [insights, setInsights] = useState<string[]>([])

  const fetchClassTypes = async () => {
    try {
      const response = await fetch('/api/class-types')
      if (!response.ok) throw new Error('Failed to fetch class types')
      const data = await response.json()
      setClassTypes(data.classTypes || [])
    } catch (error) {
      console.error('Error fetching class types:', error)
    }
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        ...(classTypeId !== 'all' && { classTypeId })
      })

      const response = await fetch(`/api/analytics/utilization?${params}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')

      const analyticsData = await response.json()
      setData(analyticsData)
      generateInsights(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = (analyticsData: any) => {
    const newInsights = []

    // Utilization insights
    if (analyticsData.overallMetrics.averageUtilization < 50) {
      newInsights.push('⚠️ Average utilization is below 50%. Consider consolidating classes or adjusting schedule.')
    } else if (analyticsData.overallMetrics.averageUtilization > 80) {
      newInsights.push('🎯 Excellent utilization rate! Consider adding more classes at peak times.')
    }

    // Time slot insights
    const bestTimeSlot = analyticsData.timeSlotUtilization?.sort((a: any, b: any) =>
      b.averageUtilization - a.averageUtilization
    )[0]
    if (bestTimeSlot) {
      newInsights.push(`🏆 Best performing time slot: ${bestTimeSlot.time} with ${bestTimeSlot.averageUtilization.toFixed(1)}% utilization`)
    }

    // Day of week insights
    const bestDay = analyticsData.dayOfWeekPatterns?.sort((a: any, b: any) =>
      b.averageUtilization - a.averageUtilization
    )[0]
    if (bestDay) {
      newInsights.push(`📅 ${bestDay.day} has the highest demand with ${bestDay.averageUtilization.toFixed(1)}% utilization`)
    }

    // No-show insights
    if (analyticsData.noShowStats?.noShowRate > 10) {
      newInsights.push(`⚠️ High no-show rate (${analyticsData.noShowStats.noShowRate.toFixed(1)}%). Consider implementing cancellation policies.`)
    }

    // Revenue insights
    if (analyticsData.revenueMetrics?.averageRevenuePerClass) {
      newInsights.push(`💰 Average revenue per class: $${analyticsData.revenueMetrics.averageRevenuePerClass.toFixed(0)}`)
    }

    // Growth insights
    if (analyticsData.trends?.bookingGrowth > 10) {
      newInsights.push(`📈 Strong booking growth of ${analyticsData.trends.bookingGrowth.toFixed(1)}% compared to previous period`)
    } else if (analyticsData.trends?.bookingGrowth < -10) {
      newInsights.push(`📉 Booking decline of ${Math.abs(analyticsData.trends.bookingGrowth).toFixed(1)}% - investigate causes`)
    }

    setInsights(newInsights)
  }

  const handleQuickDateRange = (range: string) => {
    const today = new Date()
    let from: Date
    let to: Date = today

    switch (range) {
      case 'week':
        from = subDays(today, 7)
        break
      case 'month':
        from = subDays(today, 30)
        break
      case 'quarter':
        from = subDays(today, 90)
        break
      case 'thisWeek':
        from = startOfWeek(today)
        to = endOfWeek(today)
        break
      case 'thisMonth':
        from = startOfMonth(today)
        to = endOfMonth(today)
        break
      default:
        from = subDays(today, 30)
    }

    setDateRange({ from, to })
  }

  const exportData = () => {
    if (!data) return

    const csv = generateCSV(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utilization-analytics-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const generateCSV = (data: any) => {
    let csv = 'EME Studio - Class Utilization Analytics\n'
    csv += `Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}\n\n`

    // Overall metrics
    csv += 'Overall Metrics\n'
    csv += 'Metric,Value\n'
    csv += `Average Utilization,${data.overallMetrics.averageUtilization.toFixed(1)}%\n`
    csv += `Total Classes,${data.overallMetrics.totalClasses}\n`
    csv += `Full Classes,${data.overallMetrics.fullClasses}\n`
    csv += `Empty Classes,${data.overallMetrics.emptyClasses}\n`
    csv += `Total Revenue,$${data.revenueMetrics.totalRevenue.toFixed(0)}\n\n`

    // Time slot utilization
    csv += 'Time Slot Utilization\n'
    csv += 'Time,Classes,Utilization %,Revenue\n'
    data.timeSlotUtilization.forEach((slot: any) => {
      csv += `${slot.time},${slot.totalClasses},${slot.averageUtilization.toFixed(1)},$${slot.totalRevenue.toFixed(0)}\n`
    })
    csv += '\n'

    // Day of week patterns
    csv += 'Day of Week Patterns\n'
    csv += 'Day,Classes,Utilization %\n'
    data.dayOfWeekPatterns.forEach((day: any) => {
      csv += `${day.day},${day.totalClasses},${day.averageUtilization.toFixed(1)}\n`
    })

    return csv
  }

  useEffect(() => {
    fetchClassTypes()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, classTypeId])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart2 className="h-8 w-8" />
            Class Utilization Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Optimize your schedule with detailed capacity and revenue insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <div className="flex gap-2">
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={setDateRange}
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickDateRange('week')}
                  >
                    7D
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickDateRange('month')}
                  >
                    30D
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickDateRange('quarter')}
                  >
                    90D
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Class Type</label>
              <Select value={classTypeId} onValueChange={setClassTypeId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {classTypes.map(type => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <Alert key={index} className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{insight}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Charts */}
      {data && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeslots">Time Slots</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <UtilizationCharts data={data} />
          </TabsContent>

          <TabsContent value="timeslots">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time Slot Performance Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of capacity utilization by time slot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time Slot</th>
                          <th className="text-center p-2">Classes</th>
                          <th className="text-center p-2">Total Capacity</th>
                          <th className="text-center p-2">Total Booked</th>
                          <th className="text-center p-2">Utilization</th>
                          <th className="text-right p-2">Revenue</th>
                          <th className="text-right p-2">Avg Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.timeSlotUtilization.map((slot: any) => (
                          <tr key={slot.time} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{slot.time}</td>
                            <td className="text-center p-2">{slot.totalClasses}</td>
                            <td className="text-center p-2">{slot.totalCapacity}</td>
                            <td className="text-center p-2">{slot.totalBooked}</td>
                            <td className="text-center p-2">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${slot.averageUtilization}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {slot.averageUtilization.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="text-right p-2">${slot.totalRevenue.toFixed(0)}</td>
                            <td className="text-right p-2">${slot.averageRevenue.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Booking Patterns</CardTitle>
                  <CardDescription>
                    Understand how bookings vary throughout the week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {data.dayOfWeekPatterns.map((day: any) => (
                      <div key={day.day} className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">{day.day}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Classes:</span>
                            <span className="font-medium">{day.totalClasses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Utilization:</span>
                            <span className="font-medium">{day.averageUtilization.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Peak Time:</span>
                            <span className="font-medium">{day.mostPopularTime || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${day.averageUtilization}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ${data.revenueMetrics.totalRevenue.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Period total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Average per Class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      ${data.revenueMetrics.averageRevenuePerClass.toFixed(0)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Per class average
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Revenue Efficiency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      ${(data.revenueMetrics.totalRevenue / (data.overallMetrics.totalCapacity || 1)).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Per capacity slot
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Instructor Performance Metrics</CardTitle>
                  <CardDescription>
                    Compare instructor performance across key metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.instructorPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {data.instructorPerformance.map((instructor: any) => (
                        <div key={instructor.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-lg">{instructor.name}</h3>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {instructor.averageUtilization.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Avg Utilization</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Classes:</span>
                              <span className="ml-2 font-medium">{instructor.totalClasses}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Students:</span>
                              <span className="ml-2 font-medium">{instructor.totalBooked}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Revenue:</span>
                              <span className="ml-2 font-medium">${instructor.totalRevenue.toFixed(0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">No-shows:</span>
                              <span className="ml-2 font-medium">{instructor.noShows}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No instructor data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}