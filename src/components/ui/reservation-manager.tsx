'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Users, UserPlus, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'

interface Student {
  id: string
  name: string
  email: string
  packages: Array<{
    id: string
    name: string
    creditsRemaining: number
  }>
}

interface ReservationManagerProps {
  classId: string
  currentCapacity: number
  currentBookings: number
  className?: string
  onReservationCreated?: () => void
}

export function ReservationManager({
  classId,
  currentCapacity,
  currentBookings,
  className,
  onReservationCreated
}: ReservationManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('none')
  const [forceOverride, setForceOverride] = useState(false)
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState('')
  const [success, setSuccess] = useState('')

  const availableSpots = Math.max(0, currentCapacity - currentBookings)
  const isAtCapacity = availableSpots === 0
  const selectedStudentData = students.find(s => s.id === selectedStudent)

  // Load students when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadStudents()
    }
  }, [isOpen])

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const handleCreateReservation = async () => {
    if (!selectedStudent) {
      setWarning('Please select a student')
      return
    }

    setLoading(true)
    setWarning('')
    setSuccess('')

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          userId: selectedStudent,
          packageId: selectedPackage === 'none' ? undefined : selectedPackage,
          forceOverride: isAtCapacity ? forceOverride : false
        })
      })

      const data = await response.json()

      if (response.status === 409 && data.requiresOverride) {
        // Show capacity warning for admin
        setWarning(data.warning)
        return
      }

      if (response.status === 202) {
        // Added to waitlist
        setSuccess(`Student added to waitlist at position ${data.waitlistEntry.position}`)
      } else if (response.ok) {
        // Reservation created successfully
        setSuccess(`Reservation created successfully! ${data.classStatus.availableSpots} spots remaining.`)
      } else {
        setWarning(data.error || 'Failed to create reservation')
        return
      }

      // Call parent callback to refresh data
      if (onReservationCreated) {
        onReservationCreated()
      }

      // Reset form after success
      setTimeout(() => {
        setIsOpen(false)
        resetForm()
      }, 2000)

    } catch (error) {
      console.error('Reservation creation error:', error)
      setWarning('Failed to create reservation')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedStudent('')
    setSelectedPackage('none')
    setForceOverride(false)
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
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Student to Class</DialogTitle>
          <DialogDescription>
            Manually add a student to this class. The system will handle capacity limits and waitlist management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Class Status */}
          <Card className={isAtCapacity ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">
                    {currentBookings}/{currentCapacity} students
                  </span>
                </div>
                <Badge variant={isAtCapacity ? "destructive" : "default"}>
                  {isAtCapacity ? 'FULL' : `${availableSpots} spots left`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Student Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="student">Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Package Selection */}
            {selectedStudentData && selectedStudentData.packages.length > 0 && (
              <div>
                <Label htmlFor="package">Package (Optional)</Label>
                <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Use package credits..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No package (individual payment)</SelectItem>
                    {selectedStudentData.packages
                      .filter(pkg => pkg.creditsRemaining > 0)
                      .map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {pkg.creditsRemaining} credits remaining
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Capacity Override for Admins */}
          {isAtCapacity && warning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p>{warning}</p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="override"
                      checked={forceOverride}
                      onCheckedChange={(checked) => setForceOverride(checked as boolean)}
                    />
                    <Label htmlFor="override" className="text-sm">
                      Yes, add student anyway (exceed capacity)
                    </Label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <AlertDescription className="text-green-800 ml-2">
                  {success}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Regular Warning */}
          {warning && !isAtCapacity && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateReservation}
              disabled={loading || !selectedStudent || (isAtCapacity && !!warning && !forceOverride)}
            >
              {loading ? 'Adding...' : isAtCapacity ? 'Add to Waitlist' : 'Add Student'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}