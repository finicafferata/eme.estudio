'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import {
  Search,
  Filter,
  Calendar,
  User,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Download,
  Users,
  MapPin,
  RefreshCw,
  CreditCard,
  Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BulkReservationManager } from '@/components/ui/bulk-reservation-manager'
import { Checkbox } from '@/components/ui/checkbox'
import { CancellationManager } from '@/components/ui/cancellation-manager'

interface Reservation {
  id: string
  status: string
  reservedAt: string
  checkedInAt?: string
  cancelledAt?: string
  cancellationReason?: string
  notes?: string
  student: {
    id: string
    name: string
    email: string
  }
  class: {
    id: string
    name: string
    description?: string
    startsAt: string
    endsAt: string
    capacity: number
    status: string
    location: string
    instructor: string
  }
  package?: {
    name: string
    creditsUsed: number
    totalCredits: number
  }
}

interface ReservationStats {
  total: number
  confirmed: number
  checkedIn: number
  cancelled: number
  noShow: number
  completed: number
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<ReservationStats>({
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    cancelled: 0,
    noShow: 0,
    completed: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedReservations, setSelectedReservations] = useState<string[]>([])

  const loadReservations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reservations')
      if (response.ok) {
        const data = await response.json()
        setReservations(data.reservations || [])

        // Calculate stats
        const reservations = data.reservations || []
        const newStats = {
          total: reservations.length,
          confirmed: reservations.filter((r: Reservation) => r.status === 'CONFIRMED').length,
          checkedIn: reservations.filter((r: Reservation) => r.status === 'CHECKED_IN').length,
          cancelled: reservations.filter((r: Reservation) => r.status === 'CANCELLED').length,
          noShow: reservations.filter((r: Reservation) => r.status === 'NO_SHOW').length,
          completed: reservations.filter((r: Reservation) => r.status === 'COMPLETED').length,
        }
        setStats(newStats)
      }
    } catch (error) {
      console.error('Error loading reservations:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateReservationStatus = async (reservationId: string, status: string, reason?: string) => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          cancellationReason: reason
        })
      })

      if (response.ok) {
        await loadReservations() // Reload data
        if (selectedReservation?.id === reservationId) {
          // Update selected reservation
          const updated = reservations.find(r => r.id === reservationId)
          if (updated) {
            setSelectedReservation({ ...updated, status })
          }
        }
      }
    } catch (error) {
      console.error('Error updating reservation:', error)
    }
  }

  const deleteReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadReservations()
        setDetailsOpen(false)
      }
    } catch (error) {
      console.error('Error deleting reservation:', error)
    }
  }

  const handleBulkUpdate = async (reservationIds: string[], action: string, data?: any) => {
    for (const id of reservationIds) {
      if (action === 'DELETE') {
        await fetch(`/api/reservations/${id}`, {
          method: 'DELETE'
        })
      } else {
        await fetch(`/api/reservations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: action,
            cancellationReason: data?.reason
          })
        })
      }
    }
    await loadReservations()
  }

  const toggleReservationSelection = (reservationId: string) => {
    setSelectedReservations(prev =>
      prev.includes(reservationId)
        ? prev.filter(id => id !== reservationId)
        : [...prev, reservationId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedReservations.length === filteredReservations.length) {
      setSelectedReservations([])
    } else {
      setSelectedReservations(filteredReservations.map(r => r.id))
    }
  }

  useEffect(() => {
    loadReservations()
  }, [])

  // Filter reservations based on search and filters
  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = searchTerm === '' ||
      reservation.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.class.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter

    const now = new Date()
    const classDate = new Date(reservation.class.startsAt)
    let matchesDate = true

    if (dateFilter === 'upcoming') {
      matchesDate = classDate >= now
    } else if (dateFilter === 'past') {
      matchesDate = classDate < now
    } else if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      matchesDate = classDate >= today && classDate < tomorrow
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'CHECKED_IN':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'NO_SHOW':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Clock className="h-4 w-4" />
      case 'CHECKED_IN':
        return <CheckCircle className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />
      case 'NO_SHOW':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservation Management</h1>
          <p className="text-muted-foreground">
            Comprehensive view of all class reservations and student bookings
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Confirmed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Checked In</p>
                <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-gray-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Completed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">No Show</p>
                <p className="text-2xl font-bold text-orange-600">{stats.noShow}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
          <CardDescription>
            Find specific reservations using search and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by student name, email, or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="date">Date</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <BulkReservationManager
        selectedReservations={selectedReservations}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedReservations([])}
      />

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations ({filteredReservations.length})</CardTitle>
          <CardDescription>
            Complete list of all class reservations with student and package details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedReservations.length === filteredReservations.length && filteredReservations.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No reservations found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReservations.includes(reservation.id)}
                          onCheckedChange={() => toggleReservationSelection(reservation.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {reservation.student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {reservation.student.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {reservation.class.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {reservation.class.location}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(new Date(reservation.class.startsAt), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(reservation.class.startsAt), 'HH:mm')} - {format(new Date(reservation.class.endsAt), 'HH:mm')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("flex items-center space-x-1 w-fit", getStatusColor(reservation.status))}>
                          {getStatusIcon(reservation.status)}
                          <span className="ml-1">{reservation.status.replace('_', ' ')}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reservation.package ? (
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-primary" />
                            <div>
                              <div className="text-sm font-medium">{reservation.package.name}</div>
                              <div className="text-xs text-gray-500">
                                {reservation.package.creditsUsed}/{reservation.package.totalCredits} credits
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Individual payment</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {format(new Date(reservation.reservedAt), 'MMM dd, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {reservation.status === 'CONFIRMED' && (
                            <CancellationManager
                              reservation={{
                                id: reservation.id,
                                student: reservation.student,
                                class: reservation.class,
                                package: reservation.package ? {
                                  id: reservation.package.name, // Using name as id since the backend doesn't return package id
                                  ...reservation.package
                                } : undefined,
                                reservedAt: reservation.reservedAt,
                                status: reservation.status
                              }}
                              onCancel={async (data) => {
                                await updateReservationStatus(
                                  reservation.id,
                                  'CANCELLED',
                                  data.reason
                                )
                              }}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReservation(reservation)
                              setDetailsOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reservation Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
            <DialogDescription>
              Complete information and management options for this reservation
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              {/* Status and Quick Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge className={cn("flex items-center space-x-1", getStatusColor(selectedReservation.status))}>
                    {getStatusIcon(selectedReservation.status)}
                    <span className="ml-1">{selectedReservation.status.replace('_', ' ')}</span>
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Reserved {format(new Date(selectedReservation.reservedAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {selectedReservation.status === 'CONFIRMED' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateReservationStatus(selectedReservation.id, 'CHECKED_IN')}
                      >
                        Check In
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Cancellation reason (optional):')
                          updateReservationStatus(selectedReservation.id, 'CANCELLED', reason || undefined)
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {selectedReservation.status === 'CHECKED_IN' && (
                    <Button
                      size="sm"
                      onClick={() => updateReservationStatus(selectedReservation.id, 'COMPLETED')}
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteReservation(selectedReservation.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Student</Label>
                  <div className="mt-1">
                    <p className="font-medium">{selectedReservation.student.name}</p>
                    <p className="text-sm text-gray-500">{selectedReservation.student.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Package Used</Label>
                  <div className="mt-1">
                    {selectedReservation.package ? (
                      <div>
                        <p className="font-medium">{selectedReservation.package.name}</p>
                        <p className="text-sm text-gray-500">
                          {selectedReservation.package.creditsUsed}/{selectedReservation.package.totalCredits} credits used
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Individual payment</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Class Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Class</Label>
                  <div className="mt-1">
                    <p className="font-medium">{selectedReservation.class.name}</p>
                    <p className="text-sm text-gray-500">{selectedReservation.class.description}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Schedule</Label>
                  <div className="mt-1">
                    <p className="font-medium">
                      {format(new Date(selectedReservation.class.startsAt), 'PPP')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(selectedReservation.class.startsAt), 'HH:mm')} - {format(new Date(selectedReservation.class.endsAt), 'HH:mm')}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="mt-1">{selectedReservation.class.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Instructor</Label>
                  <p className="mt-1">{selectedReservation.class.instructor}</p>
                </div>
              </div>

              {/* Status History */}
              <div>
                <Label className="text-sm font-medium">Status History</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">Reserved</span>
                    <span className="text-sm text-gray-600">
                      {format(new Date(selectedReservation.reservedAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  {selectedReservation.checkedInAt && (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Checked In</span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(selectedReservation.checkedInAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                  {selectedReservation.cancelledAt && (
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm">Cancelled</span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(selectedReservation.cancelledAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(selectedReservation.notes || selectedReservation.cancellationReason) && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded">
                    {selectedReservation.cancellationReason && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-red-600">Cancellation reason: </span>
                        <span className="text-sm">{selectedReservation.cancellationReason}</span>
                      </div>
                    )}
                    {selectedReservation.notes && (
                      <p className="text-sm">{selectedReservation.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}