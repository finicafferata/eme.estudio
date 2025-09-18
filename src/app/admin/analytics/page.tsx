'use client'

import { useState } from 'react'
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
  BarChart3,
  Activity,
  TrendingDown,
  Eye,
  Download,
  RefreshCw,
  Clock,
  Users,
  DollarSign
} from 'lucide-react'
import { ActivityFeed } from '@/components/ui/activity-feed'
import { CancellationAnalytics } from '@/components/ui/cancellation-analytics'
import Link from 'next/link'

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('activity')
  const [timeframe, setTimeframe] = useState('30')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Studio Analytics</h1>
          <p className="text-muted-foreground">
            Real-time activity monitoring and cancellation management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/analytics/utilization">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Class Utilization</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Analytics</div>
              <p className="text-xs text-muted-foreground">
                Time slots, booking patterns, and capacity analysis
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Analysis</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Detailed revenue breakdowns and financial insights
            </p>
          </CardContent>
        </Card>

        <Link href="/admin/analytics/students">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Student Analytics</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Analytics</div>
              <p className="text-xs text-muted-foreground">
                Attendance rates, engagement tracking, and behavior patterns
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Live Activity</span>
          </TabsTrigger>
          <TabsTrigger value="cancellations" className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4" />
            <span>Cancellations</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Booking Trends</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <ActivityFeed
            maxItems={100}
            refreshInterval={30000}
            showStats={true}
          />
        </TabsContent>

        <TabsContent value="cancellations" className="space-y-6">
          <CancellationAnalytics timeframe={timeframe} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Patterns</CardTitle>
                <CardDescription>
                  Daily booking trends over the selected timeframe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Booking trends chart will be implemented here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Class Popularity</CardTitle>
                <CardDescription>
                  Most and least popular class types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Class popularity chart will be implemented here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>
                  Revenue breakdown by time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Revenue trends chart will be implemented here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Retention</CardTitle>
                <CardDescription>
                  Student booking frequency and retention rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  Student retention chart will be implemented here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>
                  AI-powered insights based on your studio data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Peak Hours Optimization</h4>
                  <p className="text-sm text-blue-800">
                    Your 6 PM - 8 PM slots have the highest demand. Consider adding more classes during these hours.
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-900 mb-2">Cancellation Pattern</h4>
                  <p className="text-sm text-orange-800">
                    Weather-related cancellations are 40% higher than average. Consider implementing a flexible weather policy.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Student Engagement</h4>
                  <p className="text-sm text-green-800">
                    Students who book packages show 85% higher retention rates compared to single-class bookings.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Action items to improve studio operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="h-2 w-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Address High Cancellation Students</h4>
                    <p className="text-sm text-muted-foreground">
                      3 students have cancelled more than 5 times this month. Consider reaching out.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="h-2 w-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Optimize Capacity</h4>
                    <p className="text-sm text-muted-foreground">
                      Tuesday 2 PM classes consistently run at 50% capacity. Consider reducing or rescheduling.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Expand Popular Sessions</h4>
                    <p className="text-sm text-muted-foreground">
                      Friday evening classes fill up 3 days in advance. Consider adding extra sessions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators for the selected timeframe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">94.2%</div>
                    <div className="text-sm text-muted-foreground">Class Utilization</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">88.7%</div>
                    <div className="text-sm text-muted-foreground">Student Satisfaction</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">8.3%</div>
                    <div className="text-sm text-muted-foreground">Cancellation Rate</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">76%</div>
                    <div className="text-sm text-muted-foreground">Repeat Bookings</div>
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