'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Timer,
  Wallet,
  BarChart3,
  TrendingDown as TrendingDownIcon
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PackageData {
  id: string
  name: string
  status: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  usagePercentage: number
  purchasedAt: string
  expiresAt?: string
  expirationStatus: 'active' | 'expiring_soon' | 'expired' | 'no_expiry'
  daysUntilExpiry?: number
  creditsPerDay: number
  classType?: {
    id: string
    name: string
    slug: string
  } | null
  totalPaid: number
  paymentStatus: string
  paymentCount: number
  lastPayment?: {
    amount: number
    paidAt?: string
    status: string
    method: string
    createdAt: string
  } | null
  allPayments: Array<{
    id: string
    amount: number
    status: string
    method: string
    paidAt?: string
    createdAt: string
    notes?: string
  }>
  recentUsage: Array<{
    id: string
    reservedAt: string
    status: string
    className: string
    classDate: string
    instructor?: string | null
  }>
}

interface Summary {
  totalActiveCredits: number
  totalCreditsEverPurchased: number
  totalCreditsUsed: number
  totalAmountSpent: number
  averageCostPerCredit: number
  activePackagesCount: number
  expiredPackagesCount: number
  expiringPackagesCount: number
  usedUpPackagesCount: number
  totalPackageValue: number
  usedValue: number
  remainingValue: number
  valueUtilizationRate: number
  fullyPaidPackages: number
  pendingPaymentPackages: number
  expiredUnusedCredits: number
  expiredUnusedValue: number
}

interface Alerts {
  expiringPackages: Array<{
    id: string
    name: string
    daysUntilExpiry?: number
    remainingCredits: number
  }>
  expiredPackages: Array<{
    id: string
    name: string
    remainingCredits: number
  }>
}

export default function StudentCreditsPage() {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalActiveCredits: 0,
    totalCreditsEverPurchased: 0,
    totalCreditsUsed: 0,
    totalAmountSpent: 0,
    averageCostPerCredit: 0,
    activePackagesCount: 0,
    expiredPackagesCount: 0,
    expiringPackagesCount: 0
  })
  const [alerts, setAlerts] = useState<Alerts>({ expiringPackages: [], expiredPackages: [] })
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showExpired, setShowExpired] = useState(false)

  const loadCredits = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/student/credits')
      if (!response.ok) {
        throw new Error('Failed to load credit information')
      }

      const data = await response.json()
      setPackages(data.packages)
      setSummary(data.summary)
      setAlerts(data.alerts)
      setRecommendations(data.recommendations)

    } catch (error) {
      console.error('Error loading credits:', error)
      setError(error instanceof Error ? error.message : 'Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  const getExpirationBadge = (pkg: PackageData) => {
    switch (pkg.expirationStatus) {
      case 'expiring_soon':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expires in {pkg.daysUntilExpiry} day{pkg.daysUntilExpiry !== 1 ? 's' : ''}
          </Badge>
        )
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <Clock className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      case 'no_expiry':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            No Expiry
          </Badge>
        )
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      case 'USED_UP':
        return <Badge className="bg-gray-100 text-gray-800">Used Up</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'FULLY_PAID':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid in Full
          </Badge>
        )
      case 'PARTIALLY_PAID':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Timer className="w-3 h-3 mr-1" />
            Partially Paid
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Payment Pending
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Payment Failed
          </Badge>
        )
      case 'NO_PAYMENTS':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            No Payments
          </Badge>
        )
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const filteredPackages = showExpired ? packages : packages.filter(p => p.status === 'ACTIVE')

  useEffect(() => {
    loadCredits()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Credits</h1>
          <p className="text-muted-foreground">Track your packages, credits, and usage history</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={loadCredits}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExpired(!showExpired)}
          >
            {showExpired ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showExpired ? 'Hide Expired' : 'Show All'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Alerts */}
      {(alerts.expiringPackages.length > 0 || alerts.expiredPackages.length > 0) && (
        <div className="space-y-3">
          {alerts.expiringPackages.map((pkg) => (
            <Alert key={pkg.id} className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{pkg.name}</strong> expires in {pkg.daysUntilExpiry} day{pkg.daysUntilExpiry !== 1 ? 's' : ''}!
                You have {pkg.remainingCredits} credits left to use.
              </AlertDescription>
            </Alert>
          ))}

          {alerts.expiredPackages.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <Clock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You have {alerts.expiredPackages.length} expired package(s) with unused credits.
                Contact support if you need help with these credits.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-1">
              {recommendations.map((rec, index) => (
                <div key={index}>• {rec}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.totalActiveCredits}</div>
                <div className="text-sm text-muted-foreground">Available Credits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.activePackagesCount}</div>
                <div className="text-sm text-muted-foreground">Active Packages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{summary.totalCreditsUsed}</div>
                <div className="text-sm text-muted-foreground">Credits Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary.averageCostPerCredit)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Cost/Credit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Package Investment Overview</span>
          </CardTitle>
          <CardDescription>Track the value and utilization of your package investments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Total Investment</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalPackageValue)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Value Used</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.usedValue)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Remaining Value</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.remainingValue)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-muted-foreground">Utilization Rate</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{summary.valueUtilizationRate}%</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Investment Utilization</span>
              <span>{summary.valueUtilizationRate}%</span>
            </div>
            <Progress value={summary.valueUtilizationRate} className="h-3" />
          </div>

          {summary.expiredUnusedValue > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <TrendingDownIcon className="h-4 w-4" />
                <span className="font-medium">Expired Package Value</span>
              </div>
              <div className="text-sm text-red-700 mt-1">
                {formatCurrency(summary.expiredUnusedValue)} worth of credits expired unused ({summary.expiredUnusedCredits} credits)
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Packages */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {showExpired ? 'No packages found' : 'No active packages found'}
              </div>
              <Button asChild className="mt-4">
                <a href="/student/classes">Browse Classes to Get Started</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredPackages.map((pkg) => (
            <Card key={pkg.id} className={`hover:shadow-md transition-shadow ${
              pkg.status === 'EXPIRED' ? 'border-red-200 bg-red-50' :
              pkg.expirationStatus === 'expired' ? 'border-red-200 bg-red-50' :
              pkg.expirationStatus === 'expiring_soon' ? 'border-orange-200 bg-orange-50' : ''
            }`}>
              {/* Expired Package Warning */}
              {(pkg.status === 'EXPIRED' || pkg.expirationStatus === 'expired') && pkg.remainingCredits > 0 && (
                <div className="bg-red-100 border-b border-red-200 p-3">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Package Expired</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    This package has expired with {pkg.remainingCredits} unused credits.
                    Contact support to discuss your options.
                  </p>
                </div>
              )}

              {/* Expiring Soon Warning */}
              {pkg.expirationStatus === 'expiring_soon' && pkg.remainingCredits > 0 && (
                <div className="bg-orange-100 border-b border-orange-200 p-3">
                  <div className="flex items-center space-x-2 text-orange-800">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Expires Soon</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    This package expires in {pkg.daysUntilExpiry} day{pkg.daysUntilExpiry !== 1 ? 's' : ''}.
                    Book your remaining {pkg.remainingCredits} credit{pkg.remainingCredits !== 1 ? 's' : ''} now!
                  </p>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center space-x-2">
                      <span>{pkg.name}</span>
                      {getStatusBadge(pkg.status)}
                    </CardTitle>
                    <CardDescription>
                      {pkg.classType ? `For ${pkg.classType.name} classes` : 'General package'}
                    </CardDescription>
                    <div className="flex items-center space-x-2">
                      {getPaymentStatusBadge(pkg.paymentStatus)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {getExpirationBadge(pkg)}
                    <div className="text-sm text-muted-foreground">
                      Purchased {format(parseISO(pkg.purchasedAt), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pkg.paymentCount} payment{pkg.paymentCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Credit Usage Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Credits Used</span>
                    <span>{pkg.usedCredits} of {pkg.totalCredits} ({pkg.usagePercentage}%)</span>
                  </div>
                  <Progress
                    value={pkg.usagePercentage}
                    className={`h-2 ${
                      pkg.status === 'EXPIRED' || pkg.expirationStatus === 'expired' ? 'bg-red-100' :
                      pkg.expirationStatus === 'expiring_soon' ? 'bg-orange-100' : ''
                    }`}
                  />
                  <div className="text-sm text-muted-foreground">
                    {pkg.remainingCredits} credits remaining
                  </div>
                </div>

                {/* Package Value Analysis */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Package Value Breakdown</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Investment:</span>
                      <div className="font-medium">{formatCurrency(pkg.totalPaid)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value Used:</span>
                      <div className="font-medium text-green-600">
                        {formatCurrency(pkg.totalPaid * (pkg.usedCredits / pkg.totalCredits))}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining Value:</span>
                      <div className="font-medium text-orange-600">
                        {formatCurrency(pkg.totalPaid * (pkg.remainingCredits / pkg.totalCredits))}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost per Credit:</span>
                      <div className="font-medium">
                        {formatCurrency(pkg.totalCredits > 0 ? pkg.totalPaid / pkg.totalCredits : 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Package Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Usage Rate:</span>
                    <div className="font-medium">{pkg.creditsPerDay} credits/day</div>
                  </div>
                  {pkg.expiresAt && (
                    <div>
                      <span className="text-muted-foreground">Expires:</span>
                      <div className="font-medium">{format(parseISO(pkg.expiresAt), 'MMM dd, yyyy')}</div>
                    </div>
                  )}
                  {pkg.lastPayment && (
                    <div>
                      <span className="text-muted-foreground">Last Payment:</span>
                      <div className="font-medium">
                        {formatCurrency(pkg.lastPayment.amount)}
                        <div className="text-xs text-muted-foreground">
                          {pkg.lastPayment.paidAt ? format(parseISO(pkg.lastPayment.paidAt), 'MMM dd') : 'Pending'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Payment Method:</span>
                    <div className="font-medium text-xs">
                      {pkg.lastPayment?.method || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Recent Usage */}
                {pkg.recentUsage.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Usage</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {pkg.recentUsage.slice(0, 3).map((usage) => (
                        <div key={usage.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{usage.className}</div>
                            <div className="text-muted-foreground">
                              {format(parseISO(usage.classDate), 'MMM dd')}
                              {usage.instructor && ` • ${usage.instructor}`}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {usage.status === 'COMPLETED' ? 'Attended' : usage.status}
                          </Badge>
                        </div>
                      ))}
                      {pkg.recentUsage.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          and {pkg.recentUsage.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}