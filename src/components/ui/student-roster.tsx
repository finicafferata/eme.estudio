'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
  User,
  Mail,
  Phone,
  Instagram,
  Calendar,
  Package,
  Star,
  BookOpen,
  Edit3,
  Save,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Filter,
  Search,
} from 'lucide-react'
import { format } from 'date-fns'

interface StudentRosterProps {
  data: {
    class: any
    roster: any[]
    waitlist: any[]
    summary: any
  }
  onUpdateNote: (reservationId: string, notes: string) => Promise<void>
}

export function StudentRoster({ data, onUpdateNote }: StudentRosterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'beginners' | 'returning' | 'intensivo' | 'recurrente'>('all')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const getExperienceBadge = (level: string, totalClasses: number) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800 border-green-200',
      intermediate: 'bg-blue-100 text-blue-800 border-blue-200',
      advanced: 'bg-purple-100 text-purple-800 border-purple-200',
    }

    return (
      <Badge className={colors[level as keyof typeof colors] || colors.beginner}>
        <Star className="w-3 h-3 mr-1" />
        {level} ({totalClasses} classes)
      </Badge>
    )
  }

  const getPackageTypeBadge = (packageType: string) => {
    const colors = {
      Intensivo: 'bg-orange-100 text-orange-800 border-orange-200',
      Recurrente: 'bg-blue-100 text-blue-800 border-blue-200',
    }

    return (
      <Badge className={colors[packageType as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        <Package className="w-3 h-3 mr-1" />
        {packageType}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONFIRMED: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      CHECKED_IN: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      COMPLETED: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      NO_SHOW: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.CONFIRMED
    const IconComponent = config.icon

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const filteredRoster = data.roster.filter(item => {
    // Search filter
    const searchMatch = searchTerm === '' ||
      item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.email.toLowerCase().includes(searchTerm.toLowerCase())

    // Category filter
    let categoryMatch = true
    switch (selectedFilter) {
      case 'beginners':
        categoryMatch = item.student.experienceLevel === 'beginner'
        break
      case 'returning':
        categoryMatch = item.student.isReturningStudent
        break
      case 'intensivo':
        categoryMatch = item.package?.typeSlug === 'intensivo'
        break
      case 'recurrente':
        categoryMatch = item.package?.typeSlug === 'recurrente'
        break
      default:
        categoryMatch = true
    }

    return searchMatch && categoryMatch
  })

  const handleSaveNote = async (reservationId: string) => {
    try {
      await onUpdateNote(reservationId, noteText)
      setEditingNote(null)
      setNoteText('')
    } catch (error) {
      console.error('Failed to save note:', error)
    }
  }

  const startEditingNote = (reservationId: string, currentNote?: string) => {
    setEditingNote(reservationId)
    setNoteText(currentNote || '')
  }

  return (
    <div className="space-y-6">
      {/* Class Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {data.class.title} - Student Roster
          </CardTitle>
          <CardDescription>
            {format(new Date(data.class.startsAt), 'EEEE, MMMM d, yyyy • HH:mm')} - {format(new Date(data.class.endsAt), 'HH:mm')}
            <br />
            {data.class.location.name} • {data.summary.totalEnrolled}/{data.class.capacity} students
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.totalEnrolled}</div>
            <div className="text-sm text-muted-foreground">Total Enrolled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.beginners}</div>
            <div className="text-sm text-muted-foreground">Beginners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.returning}</div>
            <div className="text-sm text-muted-foreground">Returning</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{data.summary.averageExperience}</div>
            <div className="text-sm text-muted-foreground">Avg Classes</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                All ({data.summary.totalEnrolled})
              </Button>
              <Button
                variant={selectedFilter === 'beginners' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('beginners')}
              >
                Beginners ({data.summary.beginners})
              </Button>
              <Button
                variant={selectedFilter === 'returning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('returning')}
              >
                Returning ({data.summary.returning})
              </Button>
              <Button
                variant={selectedFilter === 'intensivo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('intensivo')}
              >
                Intensivo ({data.summary.intensivoStudents})
              </Button>
              <Button
                variant={selectedFilter === 'recurrente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('recurrente')}
              >
                Recurrente ({data.summary.recurrenteStudents})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <div className="space-y-4">
        {filteredRoster.map((item) => (
          <Card key={item.reservation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-medium text-blue-700">
                  {item.student.firstName.charAt(0)}{item.student.lastName.charAt(0)}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Student Basic Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{item.student.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {item.student.email}
                        </span>
                        {item.student.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {item.student.phone}
                          </span>
                        )}
                        {item.student.instagramHandle && (
                          <span className="flex items-center gap-1">
                            <Instagram className="w-4 h-4" />
                            {item.student.instagramHandle}
                          </span>
                        )}
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <User className="w-4 h-4 mr-1" />
                          View Profile
                        </Button>
                      </DialogTrigger>
                      <StudentProfileDialog student={item} />
                    </Dialog>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(item.reservation.status)}
                    {getExperienceBadge(item.student.experienceLevel, item.student.totalClassesAttended)}
                    {item.student.isReturningStudent && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        <BookOpen className="w-3 h-3 mr-1" />
                        Returning Student
                      </Badge>
                    )}
                    {item.package && getPackageTypeBadge(item.package.type)}
                  </div>

                  {/* Package Info */}
                  {item.package && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{item.package.name}</span>
                          <div className="text-sm text-muted-foreground">
                            {item.package.remainingCredits} of {item.package.totalCredits} credits remaining
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">
                            Purchased: {format(new Date(item.package.purchasedAt), 'MMM d, yyyy')}
                          </div>
                          {item.package.expiresAt && (
                            <div className="text-muted-foreground">
                              Expires: {format(new Date(item.package.expiresAt), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructor Notes */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Instructor Notes</span>
                      {editingNote !== item.reservation.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingNote(item.reservation.id, item.reservation.notes)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {editingNote === item.reservation.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add notes about this student..."
                          className="min-h-20"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNote(item.reservation.id)}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingNote(null)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-3 rounded-lg min-h-16 flex items-center">
                        {item.reservation.notes ? (
                          <p className="text-sm">{item.reservation.notes}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No notes yet. Click edit to add notes about this student.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Waitlist */}
      {data.waitlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Waitlist ({data.waitlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.waitlist.map((waitItem) => (
              <div key={waitItem.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="font-medium">{waitItem.student.name}</div>
                  <div className="text-sm text-muted-foreground">{waitItem.student.email}</div>
                </div>
                <Badge variant="outline" className="text-yellow-700">
                  Priority {waitItem.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StudentProfileDialog({ student }: { student: any }) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-medium text-blue-700">
            {student.student.firstName.charAt(0)}{student.student.lastName.charAt(0)}
          </div>
          {student.student.name}
        </DialogTitle>
        <DialogDescription>
          Student since {format(new Date(student.student.registeredAt), 'MMMM yyyy')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Contact Information */}
        <div>
          <h4 className="font-medium mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{student.student.email}</span>
            </div>
            {student.student.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{student.student.phone}</span>
              </div>
            )}
            {student.student.instagramHandle && (
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{student.student.instagramHandle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Experience Summary */}
        <div>
          <h4 className="font-medium mb-3">Experience Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{student.student.totalClassesAttended}</div>
              <div className="text-sm text-blue-700">Total Classes</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{student.student.classesWithInstructor}</div>
              <div className="text-sm text-green-700">With You</div>
            </div>
          </div>
        </div>

        {/* Package History */}
        <div>
          <h4 className="font-medium mb-3">Package History</h4>
          <div className="max-h-48 overflow-y-auto space-y-3">
            {student.studentHistory.packages.map((pkg: any) => (
              <div key={pkg.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{pkg.name}</div>
                    <div className="text-sm text-muted-foreground">{pkg.type}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{pkg.usedCredits}/{pkg.totalCredits} credits</div>
                    <Badge variant="outline" className="mt-1">
                      {pkg.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Purchased: {format(new Date(pkg.purchasedAt), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Classes */}
        <div>
          <h4 className="font-medium mb-3">Recent Classes</h4>
          <div className="space-y-2">
            {student.studentHistory.recentClasses.slice(0, 5).map((classItem: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium text-sm">{classItem.classType}</span>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(classItem.date), 'MMM d, yyyy')}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {classItem.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DialogContent>
  )
}