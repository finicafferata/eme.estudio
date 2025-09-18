'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Package, CreditCard, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface PackageInfoProps {
  packageData?: {
    id: string
    name: string
    creditsUsed: number
    totalCredits: number
    expiresAt?: string
    status?: string
    price?: number
  }
  compact?: boolean
  className?: string
}

export function PackageInfo({ packageData, compact = false, className }: PackageInfoProps) {
  if (!packageData) {
    return (
      <div className={`flex items-center text-sm text-gray-500 ${className}`}>
        <CreditCard className="h-4 w-4 mr-2" />
        Individual payment
      </div>
    )
  }

  const creditsRemaining = packageData.totalCredits - packageData.creditsUsed
  const usagePercent = (packageData.creditsUsed / packageData.totalCredits) * 100
  const isExpired = packageData.expiresAt && new Date(packageData.expiresAt) < new Date()
  const isNearExpiry = packageData.expiresAt &&
    new Date(packageData.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Package className="h-4 w-4 text-primary" />
        <div>
          <div className="text-sm font-medium">{packageData.name}</div>
          <div className="text-xs text-gray-500">
            {creditsRemaining}/{packageData.totalCredits} credits left
          </div>
        </div>
        {isExpired && (
          <Badge variant="destructive" className="text-xs">
            Expired
          </Badge>
        )}
        {isNearExpiry && !isExpired && (
          <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
            Expires Soon
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <h4 className="font-medium">{packageData.name}</h4>
            {packageData.price && (
              <p className="text-sm text-gray-500">${packageData.price}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {creditsRemaining} / {packageData.totalCredits}
          </div>
          <div className="text-xs text-gray-500">credits remaining</div>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Usage</span>
          <span>{Math.round(usagePercent)}%</span>
        </div>
        <Progress
          value={usagePercent}
          className={`h-2 ${usagePercent > 80 ? 'text-orange-500' : 'text-green-500'}`}
        />
      </div>

      {/* Status and Expiry */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {packageData.status && (
            <Badge variant={packageData.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {packageData.status}
            </Badge>
          )}
          {isExpired && (
            <Badge variant="destructive">
              Expired
            </Badge>
          )}
          {isNearExpiry && !isExpired && (
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              Expires Soon
            </Badge>
          )}
        </div>
        {packageData.expiresAt && (
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            Expires {format(new Date(packageData.expiresAt), 'MMM dd, yyyy')}
          </div>
        )}
      </div>
    </div>
  )
}