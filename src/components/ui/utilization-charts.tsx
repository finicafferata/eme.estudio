'use client'

import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Clock, Calendar, DollarSign, Users } from 'lucide-react'

interface UtilizationChartsProps {
  data: {
    overallMetrics: any
    timeSlotUtilization: any[]
    dayOfWeekPatterns: any[]
    instructorPerformance: any[]
    noShowStats: any
    revenueMetrics: any
    trends: any
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function UtilizationCharts({ data }: UtilizationChartsProps) {
  const {
    overallMetrics,
    timeSlotUtilization,
    dayOfWeekPatterns,
    instructorPerformance,
    noShowStats,
    revenueMetrics,
    trends
  } = data

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(overallMetrics.averageUtilization)}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {getTrendIcon(trends.utilizationTrend)}
              <span>{Math.abs(trends.utilizationTrend).toFixed(1)}% vs previous period</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${overallMetrics.averageUtilization}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.fullClasses}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(overallMetrics.fullClassRate)} of all classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueMetrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {formatCurrency(revenueMetrics.averageRevenuePerClass)} per class
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(noShowStats.noShowRate)}</div>
            <p className="text-xs text-muted-foreground">
              {noShowStats.totalNoShows} total no-shows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Slot Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Average Capacity Utilization by Time Slot</CardTitle>
          <CardDescription>
            Identify your most and least popular class times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSlotUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value: any) => formatPercentage(value)}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Bar
                dataKey="averageUtilization"
                fill="#3B82F6"
                name="Avg Utilization"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Best and Worst Performing Time Slots */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">Best Performing</p>
              <p className="text-lg font-bold">
                {timeSlotUtilization.sort((a, b) => b.averageUtilization - a.averageUtilization)[0]?.time}
              </p>
              <p className="text-sm text-green-600">
                {formatPercentage(timeSlotUtilization.sort((a, b) => b.averageUtilization - a.averageUtilization)[0]?.averageUtilization || 0)} utilization
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-700">Needs Improvement</p>
              <p className="text-lg font-bold">
                {timeSlotUtilization.sort((a, b) => a.averageUtilization - b.averageUtilization)[0]?.time}
              </p>
              <p className="text-sm text-red-600">
                {formatPercentage(timeSlotUtilization.sort((a, b) => a.averageUtilization - b.averageUtilization)[0]?.averageUtilization || 0)} utilization
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day of Week Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Patterns by Day of Week</CardTitle>
            <CardDescription>
              Understand weekly patterns to optimize your schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={dayOfWeekPatterns}>
                <PolarGrid />
                <PolarAngleAxis dataKey="day" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Utilization %"
                  dataKey="averageUtilization"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Tooltip formatter={(value: any) => formatPercentage(value)} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Time Slot</CardTitle>
            <CardDescription>
              Identify your most profitable class times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueMetrics.byTimeSlot}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Instructor Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Instructor Performance</CardTitle>
          <CardDescription>
            Compare utilization rates across instructors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instructorPerformance.map((instructor) => (
              <div key={instructor.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium">{instructor.name}</p>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{instructor.totalClasses} classes</span>
                    <span>{formatPercentage(instructor.averageUtilization)} utilization</span>
                    <span>{formatCurrency(instructor.averageRevenue)} avg revenue</span>
                  </div>
                </div>
                <div className="w-32">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${instructor.averageUtilization}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No-Show Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>No-Shows by Time Slot</CardTitle>
            <CardDescription>
              Identify patterns in no-show behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={noShowStats.byTimeSlot}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" name="No-Shows" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top No-Show Students</CardTitle>
            <CardDescription>
              Students with the most no-shows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {noShowStats.byStudent.slice(0, 5).map((item: any, index: number) => (
                <div key={item.student.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                      ${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.student.name}</p>
                      <p className="text-xs text-muted-foreground">{item.student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{item.count}</p>
                    <p className="text-xs text-muted-foreground">no-shows</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Class Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={revenueMetrics.byType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => entry.type}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {revenueMetrics.byType.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueMetrics.byDayOfWeek}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Class Growth</span>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(trends.classGrowth)}
                  <span className="font-bold">{Math.abs(trends.classGrowth).toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Booking Growth</span>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(trends.bookingGrowth)}
                  <span className="font-bold">{Math.abs(trends.bookingGrowth).toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Utilization Trend</span>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(trends.utilizationTrend)}
                  <span className="font-bold">{Math.abs(trends.utilizationTrend).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}