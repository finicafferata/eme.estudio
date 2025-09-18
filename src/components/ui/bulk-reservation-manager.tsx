'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Clock,
  Trash2
} from 'lucide-react'

interface BulkReservationManagerProps {
  selectedReservations: string[]
  onBulkUpdate: (reservationIds: string[], action: string, data?: any) => Promise<void>
  onClearSelection: () => void
  className?: string
}

export function BulkReservationManager({
  selectedReservations,
  onBulkUpdate,
  onClearSelection,
  className
}: BulkReservationManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState('')

  const handleBulkAction = async () => {
    if (!action || selectedReservations.length === 0) return

    setLoading(true)
    try {
      await onBulkUpdate(selectedReservations, action, {
        reason: reason.trim() || undefined
      })

      setIsOpen(false)
      setAction('')
      setReason('')
      setConfirmAction('')
      onClearSelection()
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionDescription = (actionType: string) => {
    switch (actionType) {
      case 'CHECKED_IN':
        return 'Mark all selected reservations as checked in'
      case 'COMPLETED':
        return 'Mark all selected reservations as completed'
      case 'CANCELLED':
        return 'Cancel all selected reservations (reason recommended)'
      case 'NO_SHOW':
        return 'Mark all selected reservations as no-show'
      case 'DELETE':
        return 'Permanently delete all selected reservations (cannot be undone)'
      default:
        return ''
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'CHECKED_IN':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-gray-600" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'NO_SHOW':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const isDestructiveAction = action === 'CANCELLED' || action === 'NO_SHOW' || action === 'DELETE'
  const requiresConfirmation = action === 'DELETE'

  if (selectedReservations.length === 0) return null

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{selectedReservations.length} selected</span>
            </Badge>
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              Clear Selection
            </Button>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                Bulk Actions
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Reservation Management</DialogTitle>
                <DialogDescription>
                  Apply the same action to {selectedReservations.length} selected reservations
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Action Selection */}
                <div>
                  <Label htmlFor="action">Select Action</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose an action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECKED_IN">
                        <div className="flex items-center space-x-2">
                          {getActionIcon('CHECKED_IN')}
                          <span>Check In</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="COMPLETED">
                        <div className="flex items-center space-x-2">
                          {getActionIcon('COMPLETED')}
                          <span>Mark Completed</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="CANCELLED">
                        <div className="flex items-center space-x-2">
                          {getActionIcon('CANCELLED')}
                          <span>Cancel</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="NO_SHOW">
                        <div className="flex items-center space-x-2">
                          {getActionIcon('NO_SHOW')}
                          <span>Mark No Show</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DELETE">
                        <div className="flex items-center space-x-2">
                          {getActionIcon('DELETE')}
                          <span>Delete</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {action && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getActionDescription(action)}
                    </p>
                  )}
                </div>

                {/* Reason/Notes (for cancellations and no-shows) */}
                {(action === 'CANCELLED' || action === 'NO_SHOW') && (
                  <div>
                    <Label htmlFor="reason">
                      {action === 'CANCELLED' ? 'Cancellation Reason' : 'No Show Reason'}
                      {action === 'CANCELLED' && ' (Recommended)'}
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder={
                        action === 'CANCELLED'
                          ? 'e.g., Student request, instructor unavailable, emergency...'
                          : 'e.g., Traffic, forgot, family emergency...'
                      }
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Destructive Action Warning */}
                {isDestructiveAction && (
                  <Alert className={action === 'DELETE' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
                    <AlertTriangle className={`h-4 w-4 ${action === 'DELETE' ? 'text-red-600' : 'text-orange-600'}`} />
                    <AlertDescription className={action === 'DELETE' ? 'text-red-800' : 'text-orange-800'}>
                      {action === 'DELETE'
                        ? 'This action cannot be undone. All selected reservations will be permanently deleted.'
                        : action === 'CANCELLED'
                        ? 'This will cancel all selected reservations. Students will be notified if notifications are enabled.'
                        : 'This will mark all selected reservations as no-show, which may affect student records.'
                      }
                    </AlertDescription>
                  </Alert>
                )}

                {/* Confirmation for Delete */}
                {requiresConfirmation && (
                  <div>
                    <Label htmlFor="confirm">Type &quot;DELETE&quot; to confirm</Label>
                    <input
                      id="confirm"
                      type="text"
                      placeholder="Type DELETE to confirm"
                      value={confirmAction}
                      onChange={(e) => setConfirmAction(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    />
                  </div>
                )}

                {/* Summary */}
                {action && (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Action Summary</h4>
                      <div className="flex items-center space-x-2 text-sm">
                        {getActionIcon(action)}
                        <span>
                          {action.replace('_', ' ').toLowerCase()} {selectedReservations.length} reservations
                        </span>
                      </div>
                      {reason && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Reason:</strong> {reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAction}
                    disabled={
                      loading ||
                      !action ||
                      (requiresConfirmation && confirmAction !== 'DELETE')
                    }
                    variant={isDestructiveAction ? "destructive" : "default"}
                  >
                    {loading ? 'Processing...' : `Apply to ${selectedReservations.length} reservations`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}