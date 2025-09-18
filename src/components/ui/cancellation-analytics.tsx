'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'

interface CancellationAnalytics {
  totalCancellations: number
  cancellationRate: number
  reasonBreakdown: {
    reason: string
    count: number
    percentage: number
    category: string
  }[]
  studentPatterns: {
    studentId: string
    studentName: string
    studentEmail: string
    cancellationCount: number
    lastCancellation: string
    reasonPattern: string[]
  }[]
  timePatterns: {
    hoursBeforeClass: string
    count: number
    percentage: number
    creditsRestored: number
  }[]
  monthlyTrends: {
    month: string
    cancellations: number
    rate: number
  }[]
}

interface CancellationAnalyticsProps {
  classId?: string
  studentId?: string
  timeframe?: string
  className?: string
}

export function CancellationAnalytics({
  classId,
  studentId,
  timeframe = '30',
  className
}: CancellationAnalyticsProps) {
  const [analytics, setAnalytics] = useState<CancellationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        timeframe: selectedTimeframe,
        ...(classId && { classId }),
        ...(studentId && { studentId })
      })

      const response = await fetch(`/api/analytics/cancellations?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading cancellation analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics, selectedTimeframe, classId, studentId])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'health':
      case 'emergency':
        return 'bg-red-100 text-red-800'
      case 'studio':
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'external':
        return 'bg-orange-100 text-orange-800'
      case 'request':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No cancellation data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cancellation Analytics</h2>
          <p className="text-muted-foreground">Track patterns and manage cancellation policies</p>
        </div>
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total Cancellations</p>
                <p className="text-2xl font-bold">{analytics.totalCancellations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Cancellation Rate</p>
                <p className="text-2xl font-bold text-red-600">{analytics.cancellationRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Frequent Cancellers</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.studentPatterns.filter(s => s.cancellationCount >= 3).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Policy Overrides</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.timePatterns.filter(t => parseInt(t.hoursBeforeClass) < 24).reduce((sum, t) => sum + t.count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reason Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Reasons</CardTitle>
          <CardDescription>
            Breakdown of cancellation reasons over the selected timeframe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.reasonBreakdown.map((reason) => (
              <div key={reason.reason} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(reason.category)}>
                      {reason.category}
                    </Badge>
                    <span className="font-medium">{reason.reason.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{reason.count} cancellations</span>
                    <span className="text-xs text-muted-foreground ml-2">({reason.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <Progress value={reason.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Timing</CardTitle>
          <CardDescription>
            When students cancel relative to class start time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hours Before Class</TableHead>
                <TableHead>Cancellations</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Credits Restored</TableHead>
                <TableHead>Policy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.timePatterns.map((pattern) => {
                const hoursNum = parseInt(pattern.hoursBeforeClass)
                const needsOverride = hoursNum < 24

                return (
                  <TableRow key={pattern.hoursBeforeClass}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{pattern.hoursBeforeClass} hours</span>
                        {needsOverride && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Requires Override
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{pattern.count}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{pattern.percentage.toFixed(1)}%</span>
                        <div className="w-16">
                          <Progress value={pattern.percentage} className="h-1" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600 font-medium">{pattern.creditsRestored}</span>
                    </TableCell>
                    <TableCell>
                      {needsOverride ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Override Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Standard Policy
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Student Cancellation Patterns</CardTitle>
          <CardDescription>
            Students with frequent cancellations requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Cancellations</TableHead>
                <TableHead>Last Cancellation</TableHead>
                <TableHead>Common Reasons</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.studentPatterns
                .sort((a, b) => b.cancellationCount - a.cancellationCount)
                .slice(0, 10)
                .map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.studentName}</p>
                      <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      student.cancellationCount >= 5 ? 'text-red-600' :
                      student.cancellationCount >= 3 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {student.cancellationCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(student.lastCancellation), 'MMM dd, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.reasonPattern.slice(0, 3).map((reason, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {reason.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.cancellationCount >= 5 ? (
                      <Badge variant="destructive">High Risk</Badge>
                    ) : student.cancellationCount >= 3 ? (
                      <Badge className="bg-orange-100 text-orange-800">Monitor</Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}