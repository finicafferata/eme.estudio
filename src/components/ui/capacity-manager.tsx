'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Users, Plus, Minus, CheckCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CapacityManagerProps {
  classId: string
  currentCapacity: number
  currentBookings: number
  maxCapacity: number
  waitlistCount: number
  className?: string
  onCapacityChanged?: () => void
}

export function CapacityManager({
  classId,
  currentCapacity,
  currentBookings,
  maxCapacity,
  waitlistCount,
  className,
  onCapacityChanged
}: CapacityManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newCapacity, setNewCapacity] = useState(currentCapacity)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState('')
  const [success, setSuccess] = useState('')

  const availableSpots = Math.max(0, currentCapacity - currentBookings)
  const canIncrease = newCapacity <= maxCapacity
  const canDecrease = newCapacity >= currentBookings
  const spotsWillOpen = Math.max(0, newCapacity - currentBookings)
  const waitlistWillBePromoted = Math.min(waitlistCount, spotsWillOpen - availableSpots)

  const handleCapacityChange = async () => {
    if (newCapacity === currentCapacity) {
      setWarning('No change in capacity')
      return
    }

    if (!canIncrease || !canDecrease) {
      setWarning('Invalid capacity value')
      return
    }

    setLoading(true)
    setWarning('')
    setSuccess('')

    try {
      const response = await fetch(`/api/classes/${classId}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacity: newCapacity,
          reason: reason.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setWarning(data.error || 'Failed to update capacity')
        return
      }

      setSuccess(`Capacity updated successfully! ${data.promotedStudents?.length || 0} students promoted from waitlist.`)

      // Call parent callback to refresh data
      if (onCapacityChanged) {
        onCapacityChanged()
      }

      // Reset form
      setTimeout(() => {
        setIsOpen(false)
        setReason('')
        setSuccess('')
        setWarning('')
      }, 2000)

    } catch (error) {
      console.error('Capacity update error:', error)
      setWarning('Failed to update capacity')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNewCapacity(currentCapacity)
    setReason('')
    setWarning('')
    setSuccess('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Users className="mr-2 h-4 w-4" />
          Manage Capacity
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Class Capacity</DialogTitle>
          <DialogDescription>
            Adjust class capacity and manage student waitlist. Changes will affect future bookings immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Capacity</Label>
                  <p className="font-semibold">{currentCapacity} students</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bookings</Label>
                  <p className="font-semibold">{currentBookings} students</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Available</Label>
                  <p className="font-semibold text-green-600">{availableSpots} spots</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Waitlist</Label>
                  <p className="font-semibold text-orange-600">{waitlistCount} waiting</p>
                </div>
              </div>

              {availableSpots === 0 && (
                <Badge variant="destructive" className="w-fit">
                  Class is Full
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Capacity Adjustment */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="capacity">New Capacity</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewCapacity(Math.max(currentBookings, newCapacity - 1))}
                  disabled={newCapacity <= currentBookings}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  id="capacity"
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value) || currentCapacity)}
                  min={currentBookings}
                  max={maxCapacity}
                  className="text-center"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewCapacity(Math.min(maxCapacity, newCapacity + 1))}
                  disabled={newCapacity >= maxCapacity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Range: {currentBookings} - {maxCapacity} students
              </p>
            </div>

            {/* Impact Preview */}
            {newCapacity !== currentCapacity && (
              <Card className={newCapacity > currentCapacity ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    {newCapacity > currentCapacity ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {newCapacity > currentCapacity ? 'Increasing' : 'Decreasing'} capacity by {Math.abs(newCapacity - currentCapacity)}
                      </p>

                      {newCapacity > currentCapacity && waitlistWillBePromoted > 0 && (
                        <p className="text-sm text-green-700">
                          ✓ {waitlistWillBePromoted} student(s) will be automatically promoted from waitlist
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground">
                        New available spots: {spotsWillOpen}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="reason">Reason for Change (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., High demand, instructor preference, location constraints..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Alerts */}
          {warning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCapacityChange}
              disabled={loading || newCapacity === currentCapacity || !canIncrease || !canDecrease}
            >
              {loading ? 'Updating...' : 'Update Capacity'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}