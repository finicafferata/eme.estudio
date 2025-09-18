'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Student {
  id: string
  name: string
  email: string
}

interface ClassCompletionManagerProps {
  classId: string
  classStatus: string
  checkedInStudents: Student[]
  confirmedStudents: Student[]
  noShowStudents: Student[]
  onClassCompleted: () => void
}

export function ClassCompletionManager({
  classId,
  classStatus,
  checkedInStudents,
  confirmedStudents,
  noShowStudents,
  onClassCompleted
}: ClassCompletionManagerProps) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canComplete = classStatus === 'IN_PROGRESS' && checkedInStudents.length > 0
  const totalStudents = checkedInStudents.length + confirmedStudents.length + noShowStudents.length

  const handleCompleteClass = async () => {
    // Additional validation before API call
    if (checkedInStudents.length === 0) {
      setError('No students are checked in. Please check in students before completing the class.')
      return
    }

    if (classStatus !== 'IN_PROGRESS') {
      setError('Class must be in progress to be completed.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/classes/${classId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes.trim() || undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete class')
      }

      const result = await response.json()
      console.log('Class completed:', result)

      setOpen(false)
      setNotes('')
      onClassCompleted()

    } catch (error) {
      console.error('Error completing class:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete class')
    } finally {
      setLoading(false)
    }
  }

  const getButtonText = () => {
    if (classStatus === 'COMPLETED') return 'Class Completed'
    if (classStatus === 'CANCELLED') return 'Class Cancelled'
    if (classStatus === 'SCHEDULED') return 'Mark Students as Checked In First'
    if (checkedInStudents.length === 0) return 'No Students to Complete'
    return 'Complete Class'
  }

  const getButtonVariant = () => {
    if (canComplete) return 'default'
    return 'outline'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={getButtonVariant()}
          disabled={!canComplete || loading}
          className={canComplete ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Complete Class</DialogTitle>
          <DialogDescription>
            Mark this class as completed and finalize student attendance records.
            Credits have already been deducted for checked-in students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Students Summary */}
          <div className="space-y-4">
            <h4 className="font-medium">Attendance Summary</h4>

            {/* Students to be completed */}
            {checkedInStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">
                    Students to be marked as completed ({checkedInStudents.length})
                  </span>
                </div>
                <div className="pl-6 space-y-1 max-h-32 overflow-y-auto">
                  {checkedInStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm">
                      <span>{student.name}</span>
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        Checked In → Completed
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Students not checked in */}
            {confirmedStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-700">
                    Students not checked in ({confirmedStudents.length})
                  </span>
                </div>
                <div className="pl-6 space-y-1 max-h-32 overflow-y-auto">
                  {confirmedStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm">
                      <span>{student.name}</span>
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                        No Credits Deducted
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No-show students */}
            {noShowStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-700">
                    No-show students ({noShowStudents.length})
                  </span>
                </div>
                <div className="pl-6 space-y-1 max-h-32 overflow-y-auto">
                  {noShowStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-sm">
                      <span>{student.name}</span>
                      <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                        Credits Retained
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Class Notes */}
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Class Completion Notes (Optional)</Label>
            <Textarea
              id="completion-notes"
              placeholder="What was covered in this class? Materials used? Special notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              These notes will be added to the class record for future reference.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {checkedInStudents.length} students will be marked as completed
              </span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleCompleteClass}
                disabled={loading || checkedInStudents.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Completing...' : 'Complete Class'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}