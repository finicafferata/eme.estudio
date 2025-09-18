'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  Mail,
  CheckCircle,
  Calendar,
  Users,
  CreditCard,
  Play,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ExpirationReport {
  summary: {
    totalActivePackages: number
    expiredCount: number
    expiring7Days: number
    expiring30Days: number
    withoutExpirationDate: number
    totalExpiredCredits: number
    totalExpiringCredits7Days: number
    totalExpiringCredits30Days: number
  }
  expired: PackageInfo[]
  expiring7Days: PackageInfo[]
  expiring30Days: PackageInfo[]
  withoutExpirationDate: PackageInfo[]
}

interface PackageInfo {
  id: string
  name: string
  userName: string
  userEmail: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  purchasedAt: string
  expiresAt: string | null
  daysUntilExpiry: number | null
}

interface ProcessingResult {
  action: string
  result: any
}

export function PackageExpirationManager() {
  const [report, setReport] = useState<ExpirationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null)

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/package-expiration')
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      }
    } catch (error) {
      console.error('Error loading expiration report:', error)
    } finally {
      setLoading(false)
    }
  }

  const processAction = async (action: string) => {
    try {
      setProcessing(true)
      const response = await fetch('/api/admin/package-expiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        const result = await response.json()
        setLastResult(result)
        await loadReport() // Refresh the report
      }
    } catch (error) {
      console.error(`Error processing ${action}:`, error)
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!report) return null

  const PackageTable = ({ packages, title, icon: Icon, badgeColor }: {
    packages: PackageInfo[]
    title: string
    icon: any
    badgeColor: string
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
          <Badge className={badgeColor}>{packages.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No packages found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead>Expires</TableHead>
                {title.includes('Expiring') && <TableHead>Days Left</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{pkg.userName}</div>
                      <div className="text-sm text-muted-foreground">{pkg.userEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>{pkg.name}</TableCell>
                  <TableCell>
                    <span className="font-medium">{pkg.remainingCredits}</span> / {pkg.totalCredits}
                  </TableCell>
                  <TableCell>{format(new Date(pkg.purchasedAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {pkg.expiresAt ? format(new Date(pkg.expiresAt), 'MMM dd, yyyy') : 'No expiry'}
                  </TableCell>
                  {title.includes('Expiring') && (
                    <TableCell>
                      <Badge variant={pkg.daysUntilExpiry && pkg.daysUntilExpiry <= 7 ? 'destructive' : 'secondary'}>
                        {pkg.daysUntilExpiry} days
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Package Expiration Management</h2>
          <p className="text-muted-foreground">Monitor and manage package expiration dates</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadReport} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => processAction('full_process')} disabled={processing}>
            <Play className="mr-2 h-4 w-4" />
            Run Full Process
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{report.summary.totalActivePackages}</div>
                <div className="text-sm text-muted-foreground">Active Packages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{report.summary.expiredCount}</div>
                <div className="text-sm text-muted-foreground">Expired</div>
                <div className="text-xs text-red-600">{report.summary.totalExpiredCredits} credits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{report.summary.expiring7Days}</div>
                <div className="text-sm text-muted-foreground">Expiring (7 days)</div>
                <div className="text-xs text-orange-600">{report.summary.totalExpiringCredits7Days} credits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{report.summary.expiring30Days}</div>
                <div className="text-sm text-muted-foreground">Expiring (30 days)</div>
                <div className="text-xs text-yellow-600">{report.summary.totalExpiringCredits30Days} credits</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Management Actions</CardTitle>
          <CardDescription>Perform maintenance operations on package expiration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => processAction('set_missing_dates')}
              disabled={processing}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Set Missing Dates</span>
              <span className="text-xs text-muted-foreground">{report.summary.withoutExpirationDate} packages</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => processAction('process_expired')}
              disabled={processing}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <AlertTriangle className="h-6 w-6" />
              <span className="text-sm">Process Expired</span>
              <span className="text-xs text-muted-foreground">{report.summary.expiredCount} packages</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => processAction('send_warnings')}
              disabled={processing}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Mail className="h-6 w-6" />
              <span className="text-sm">Send Warnings</span>
              <span className="text-xs text-muted-foreground">{report.summary.expiring7Days} emails</span>
            </Button>

            <Button
              onClick={() => processAction('full_process')}
              disabled={processing}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">Full Process</span>
              <span className="text-xs text-muted-foreground">All operations</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Processing Result */}
      {lastResult && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Last operation: {lastResult.action}</div>
              <div className="text-sm">
                {JSON.stringify(lastResult.result, null, 2)}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Package Tables */}
      <div className="space-y-6">
        {report.summary.expiredCount > 0 && (
          <PackageTable
            packages={report.expired}
            title="Expired Packages"
            icon={AlertTriangle}
            badgeColor="bg-red-100 text-red-800"
          />
        )}

        {report.summary.expiring7Days > 0 && (
          <PackageTable
            packages={report.expiring7Days}
            title="Expiring Soon (7 days)"
            icon={Clock}
            badgeColor="bg-orange-100 text-orange-800"
          />
        )}

        {report.summary.expiring30Days > 0 && (
          <PackageTable
            packages={report.expiring30Days}
            title="Expiring Soon (30 days)"
            icon={Calendar}
            badgeColor="bg-yellow-100 text-yellow-800"
          />
        )}

        {report.summary.withoutExpirationDate > 0 && (
          <PackageTable
            packages={report.withoutExpirationDate}
            title="Packages Without Expiration Date"
            icon={AlertCircle}
            badgeColor="bg-gray-100 text-gray-800"
          />
        )}
      </div>
    </div>
  )
}