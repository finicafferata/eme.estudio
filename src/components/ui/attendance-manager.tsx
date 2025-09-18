'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Users,
  Package,
  Star,
  BookOpen,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
  TrendingUp,
  Award,
  Target,
} from 'lucide-react'
import { format } from 'date-fns'

interface AttendanceManagerProps {
  classId: string
  onAttendanceUpdate?: () => void
}

export function AttendanceManager({ classId, onAttendanceUpdate }: AttendanceManagerProps) {
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [progressDialog, setProgressDialog] = useState(false)

  // Progress notes form state
  const [progressNotes, setProgressNotes] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [techniquesLearned, setTechniquesLearned] = useState<string[]>([])
  const [areasToImprove, setAreasToImprove] = useState<string[]>([])
  const [classRating, setClassRating] = useState<number | null>(null)
  const [privateNotes, setPrivateNotes] = useState('')

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/instructor/attendance?classId=${classId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setAttendanceData(data)
    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAttendance = async (reservationId: string, status: string) => {
    try {
      setUpdating(reservationId)

      const response = await fetch('/api/instructor/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          status,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh data
      await fetchAttendanceData()
      if (onAttendanceUpdate) {
        onAttendanceUpdate()
      }
    } catch (error) {
      console.error('Failed to update attendance:', error)
    } finally {
      setUpdating(null)
    }
  }

  const saveProgressNotes = async () => {
    if (!selectedStudent) return

    try {
      const response = await fetch('/api/instructor/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: selectedStudent.reservationId,
          progressNotes,
          skillLevel,
          techniquesLearned,
          areasToImprove,
          classRating,
          privateNotes,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Reset form and close dialog
      resetProgressForm()
      setProgressDialog(false)
      setSelectedStudent(null)

      // Refresh attendance data
      await fetchAttendanceData()
    } catch (error) {
      console.error('Failed to save progress notes:', error)
    }
  }

  const resetProgressForm = () => {
    setProgressNotes('')
    setSkillLevel('')
    setTechniquesLearned([])
    setAreasToImprove([])
    setClassRating(null)
    setPrivateNotes('')
  }

  const openProgressDialog = (student: any) => {
    setSelectedStudent(student)

    // Pre-populate form if student has existing notes
    if (student.notes) {
      try {
        const noteData = JSON.parse(student.notes)
        setProgressNotes(noteData.progressNotes || '')
        setSkillLevel(noteData.skillLevel || '')
        setTechniquesLearned(noteData.techniquesLearned || [])
        setAreasToImprove(noteData.areasToImprove || [])
        setClassRating(noteData.classRating || null)
        setPrivateNotes(noteData.privateNotes || '')
      } catch {
        // If notes aren't JSON, treat as simple text
        setProgressNotes(student.notes || '')
      }
    } else {
      resetProgressForm()
    }

    setProgressDialog(true)
  }

  useEffect(() => {
    fetchAttendanceData()
  }, [classId])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONFIRMED: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Not Checked In' },
      CHECKED_IN: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Checked In' },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
      NO_SHOW: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'No Show' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: X, label: 'Cancelled' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.CONFIRMED
    const IconComponent = config.icon

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const addTechnique = (technique: string) => {
    if (technique.trim() && !techniquesLearned.includes(technique.trim())) {
      setTechniquesLearned([...techniquesLearned, technique.trim()])
    }
  }

  const removeTechnique = (index: number) => {
    setTechniquesLearned(techniquesLearned.filter((_, i) => i !== index))
  }

  const addImprovementArea = (area: string) => {
    if (area.trim() && !areasToImprove.includes(area.trim())) {
      setAreasToImprove([...areasToImprove, area.trim()])
    }
  }

  const removeImprovementArea = (index: number) => {
    setAreasToImprove(areasToImprove.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading attendance data...</p>
        </div>
      </div>
    )
  }

  if (!attendanceData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Failed to load attendance data</p>
          <Button onClick={fetchAttendanceData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Class Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {attendanceData.class.title} - Attendance
          </CardTitle>
          <CardDescription>
            {format(new Date(attendanceData.class.startsAt), 'EEEE, MMMM d, yyyy • HH:mm')}
            <br />
            {attendanceData.class.location}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{attendanceData.summary.totalStudents}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{attendanceData.summary.checkedIn}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{attendanceData.summary.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{attendanceData.summary.noShows}</div>
            <div className="text-sm text-muted-foreground">No Shows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{attendanceData.summary.notCheckedIn}</div>
            <div className="text-sm text-muted-foreground">Not Checked In</div>
          </CardContent>
        </Card>
      </div>

      {/* Student Attendance List */}
      <div className="space-y-4">
        {attendanceData.students.map((student: any) => (
          <Card key={student.reservationId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-medium text-blue-700">
                    {student.student.name.split(' ').map((n: string) => n.charAt(0)).join('')}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium">{student.student.name}</h4>
                    <div className="text-sm text-muted-foreground">
                      {student.student.email}
                    </div>

                    {/* Package Info */}
                    {student.package && (
                      <div className="flex items-center gap-2 mt-1">
                        <Package className="w-3 h-3" />
                        <span className="text-xs text-muted-foreground">
                          {student.package.type} - {student.package.remainingCredits} of {student.package.totalCredits} credits left
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(student.attendanceStatus)}

                  {/* Attendance Actions */}
                  <div className="flex gap-2">
                    {student.attendanceStatus !== 'CHECKED_IN' && (
                      <Button
                        size="sm"
                        onClick={() => updateAttendance(student.reservationId, 'CHECKED_IN')}
                        disabled={updating === student.reservationId}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Check In
                      </Button>
                    )}

                    {student.attendanceStatus !== 'COMPLETED' && student.attendanceStatus === 'CHECKED_IN' && (
                      <Button
                        size="sm"
                        onClick={() => updateAttendance(student.reservationId, 'COMPLETED')}
                        disabled={updating === student.reservationId}
                      >
                        <Award className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}

                    {student.attendanceStatus !== 'NO_SHOW' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAttendance(student.reservationId, 'NO_SHOW')}
                        disabled={updating === student.reservationId}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        No Show
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openProgressDialog(student)}
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      Progress
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Notes Preview */}
              {student.notes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Previous Notes:</p>
                  <p className="text-sm text-blue-800">
                    {typeof student.notes === 'string' && student.notes.startsWith('{')
                      ? JSON.parse(student.notes).progressNotes || 'Detailed progress notes saved'
                      : student.notes
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Dialog */}
      <Dialog open={progressDialog} onOpenChange={setProgressDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Student Progress - {selectedStudent?.student.name}
            </DialogTitle>
            <DialogDescription>
              Track student progress, techniques learned, and areas for improvement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Skill Level Assessment */}
            <div>
              <label className="block text-sm font-medium mb-2">Skill Level Assessment</label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Class Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Student Performance (1-5 stars)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={classRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setClassRating(rating)}
                  >
                    <Star className={`w-4 h-4 ${classRating === rating ? 'fill-current' : ''}`} />
                  </Button>
                ))}
                {classRating && (
                  <Button variant="ghost" size="sm" onClick={() => setClassRating(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Techniques Learned */}
            <div>
              <label className="block text-sm font-medium mb-2">Techniques Learned Today</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter technique name and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTechnique(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {techniquesLearned.map((technique, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {technique}
                      <button onClick={() => removeTechnique(index)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Areas to Improve */}
            <div>
              <label className="block text-sm font-medium mb-2">Areas to Improve</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter improvement area and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addImprovementArea(e.currentTarget.value)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {areasToImprove.map((area, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1 bg-orange-50 text-orange-800">
                      {area}
                      <button onClick={() => removeImprovementArea(index)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Class Progress Notes</label>
              <Textarea
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Describe the student's progress during this class..."
                className="min-h-20"
              />
            </div>

            {/* Private Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Private Instructor Notes</label>
              <Textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Private notes for instructor reference (not visible to student)..."
                className="min-h-16"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveProgressNotes}>
              <Save className="w-4 h-4 mr-1" />
              Save Progress Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}