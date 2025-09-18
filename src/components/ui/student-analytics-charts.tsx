'use client'

import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp, TrendingDown, Minus, Clock, Calendar, Users, AlertTriangle,
  CheckCircle, XCircle, User, Package, Activity
} from 'lucide-react'

interface StudentAnalyticsChartsProps {
  data: {
    overallMetrics: any
    studentAnalytics: any[]
    studentsNeedingEngagement: any[]
    highNoShowStudents: any[]
    packageCompletionAnalytics: any
    attendanceTrends: any
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function StudentAnalyticsCharts({ data }: StudentAnalyticsChartsProps) {
  const {
    overallMetrics,
    studentAnalytics,
    studentsNeedingEngagement,
    highNoShowStudents,
    packageCompletionAnalytics,
    attendanceTrends
  } = data

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getEngagementIcon = (score: number) => {
    if (score >= 70) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (score >= 40) return <Clock className="w-4 h-4 text-yellow-500" />
    return <AlertTriangle className="w-4 h-4 text-red-500" />
  }

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(overallMetrics.averageAttendanceRate)}</div>
            <p className="text-xs text-muted-foreground">
              {overallMetrics.totalAttendedClasses} of {overallMetrics.totalReservations} classes
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${overallMetrics.averageAttendanceRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg No-Show Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(overallMetrics.averageNoShowRate)}</div>
            <p className="text-xs text-muted-foreground">
              {overallMetrics.totalNoShows} total no-shows
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${overallMetrics.averageNoShowRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.highEngagementStudents}</div>
            <p className="text-xs text-muted-foreground">
              Students with 70+ engagement score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Engagement</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsNeedingEngagement.length}</div>
            <p className="text-xs text-muted-foreground">
              Students requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Student Engagement Distribution</CardTitle>
            <CardDescription>
              Distribution of students by engagement level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'High (70+)', value: attendanceTrends.engagementDistribution.high.count, color: '#10B981' },
                    { name: 'Medium (40-69)', value: attendanceTrends.engagementDistribution.medium.count, color: '#F59E0B' },
                    { name: 'Low (<40)', value: attendanceTrends.engagementDistribution.low.count, color: '#EF4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'High (70+)', value: attendanceTrends.engagementDistribution.high.count, color: '#10B981' },
                    { name: 'Medium (40-69)', value: attendanceTrends.engagementDistribution.medium.count, color: '#F59E0B' },
                    { name: 'Low (<40)', value: attendanceTrends.engagementDistribution.low.count, color: '#EF4444' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Rate Distribution</CardTitle>
            <CardDescription>
              How students are distributed across attendance rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceTrends.attendanceRateDistribution.ranges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [`${value} students`, 'Count']}
                  labelFormatter={(label) => `Attendance Rate: ${label}`}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Package Completion Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Package Completion Overview</CardTitle>
            <CardDescription>
              Analysis of package usage and completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{packageCompletionAnalytics.completedPackages}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{packageCompletionAnalytics.expiredPackages}</div>
                  <div className="text-sm text-red-700">Expired</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overall Completion Rate</span>
                  <span className="font-bold">{formatPercentage(packageCompletionAnalytics.averageCompletionRate)}</span>
                </div>
                <Progress value={packageCompletionAnalytics.averageCompletionRate} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Credits Used</span>
                  <span className="font-bold">
                    {packageCompletionAnalytics.creditsUsed} / {packageCompletionAnalytics.creditsIssued}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Waste Rate: {formatPercentage(packageCompletionAnalytics.wasteRate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Package Completion by Class Type</CardTitle>
            <CardDescription>
              Completion rates vary by class type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={packageCompletionAnalytics.packagesByClassType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="classType" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'Completion Rate']}
                  labelFormatter={(label) => `Class Type: ${label}`}
                />
                <Bar dataKey="completionRate" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Students Needing Engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Students Needing Engagement</CardTitle>
          <CardDescription>
            Students who may benefit from additional outreach or support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {studentsNeedingEngagement.slice(0, 10).map((student) => (
              <div key={student.student.id} className={`p-3 rounded-lg border ${getEngagementColor(student.engagementScore)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getEngagementIcon(student.engagementScore)}
                    <div>
                      <p className="font-medium">{student.student.name}</p>
                      <p className="text-sm opacity-75">{student.student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{student.engagementScore}</div>
                    <div className="text-xs opacity-75">Engagement Score</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Attendance:</span> {formatPercentage(student.attendanceRate)}
                  </div>
                  <div>
                    <span className="font-medium">No-shows:</span> {formatPercentage(student.noShowRate)}
                  </div>
                  <div>
                    <span className="font-medium">Last booking:</span> {student.daysSinceLastBooking}d ago
                  </div>
                  <div>
                    <span className="font-medium">Total classes:</span> {student.totalReservations}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {student.engagementFlags.highNoShow && (
                    <Badge variant="destructive" className="text-xs">High No-Show</Badge>
                  )}
                  {student.engagementFlags.lowAttendance && (
                    <Badge variant="destructive" className="text-xs">Low Attendance</Badge>
                  )}
                  {student.engagementFlags.inactive && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                  {student.engagementFlags.expiredPackages && (
                    <Badge variant="outline" className="text-xs">Expired Packages</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High No-Show Students */}
      <Card>
        <CardHeader>
          <CardTitle>High No-Show Students</CardTitle>
          <CardDescription>
            Students with the highest no-show rates requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {highNoShowStudents.slice(0, 8).map((student, index) => (
              <div key={student.student.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                    ${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-red-900">{student.student.name}</p>
                    <p className="text-sm text-red-700">{student.student.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-red-600">{formatPercentage(student.noShowRate)}</div>
                  <div className="text-xs text-red-600">
                    {student.noShows} of {student.totalReservations} classes
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Performance Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance Analysis</CardTitle>
          <CardDescription>
            Attendance rate vs. booking frequency relationship
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              data={studentAnalytics.slice(0, 50)} // Limit for performance
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey="attendanceRate"
                name="Attendance Rate"
                unit="%"
                domain={[0, 100]}
              />
              <YAxis
                type="number"
                dataKey="bookingFrequency"
                name="Bookings per Month"
                domain={[0, 10]}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: string) => [
                  name === 'attendanceRate' ? `${value.toFixed(1)}%` : `${value.toFixed(1)}`,
                  name === 'attendanceRate' ? 'Attendance Rate' : 'Bookings/Month'
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.student.name
                  }
                  return ''
                }}
              />
              <Scatter
                name="Students"
                dataKey="bookingFrequency"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      {attendanceTrends.monthlyTrends && attendanceTrends.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>New Student Acquisition Trends</CardTitle>
            <CardDescription>
              Monthly new student registration and average engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrends.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="newStudents" fill="#3B82F6" name="New Students" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageEngagement"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Avg Engagement"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}