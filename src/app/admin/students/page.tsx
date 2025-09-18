'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Eye, Edit, Package, CreditCard, SortAsc, SortDesc, Filter, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  instagram?: string
  status: string
  createdAt: string
  updatedAt: string
  notes?: string
  activePackages: number
  totalPackages: number
  totalSpent: number
  totalClasses: number
  lastActivity: string
  packages: Package[]
}

interface Package {
  id: string
  name: string
  status: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  price: number
  purchasedAt: string
  expiresAt?: string
}

interface StudentsResponse {
  students: Student[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface StudentDetails {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  instagram?: string
  status: string
  notes?: string
  createdAt: string
  updatedAt: string
  metrics: {
    activePackages: number
    totalPackages: number
    totalSpent: number
    attendedClasses: number
    upcomingClasses: number
    totalCreditsRemaining: number
  }
  packages: Package[]
  payments: any[]
  classHistory: any[]
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Filters and search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal states
  const [showDetails, setShowDetails] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instagram: '',
    notes: '',
    status: 'ACTIVE'
  })

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter && { status: statusFilter })
      })

      const response = await fetch(`/api/students?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }

      const data: StudentsResponse = await response.json()
      setStudents(data.students)
      setTotalPages(data.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, sortBy, sortOrder, currentPage])

  const fetchStudentDetails = async (studentId: string) => {
    try {
      setDetailsLoading(true)
      const response = await fetch(`/api/students/${studentId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch student details')
      }

      const data: StudentDetails = await response.json()
      setSelectedStudent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create student')
      }

      setShowCreateForm(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        instagram: '',
        notes: '',
        status: 'ACTIVE'
      })
      fetchStudents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create student')
    }
  }

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    try {
      const response = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update student')
      }

      setShowEditForm(false)
      setSelectedStudent(null)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        instagram: '',
        notes: '',
        status: 'ACTIVE'
      })
      fetchStudents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update student')
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const handleActivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/activate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al activar usuario')
      }

      const result = await response.json()
      setError(null)

      // Refresh the students list to show updated status
      fetchStudents()

      // You could also show a success message here
      console.log('Usuario activado:', result.message)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar usuario')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Activo</Badge>
      case 'INACTIVE':
        return <Badge variant="secondary">Inactivo</Badge>
      case 'SUSPENDED':
        return <Badge variant="warning">Suspendido</Badge>
      case 'PENDING_ACTIVATION':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente Activación</Badge>
      case 'PENDING_VERIFICATION':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Pendiente Verificación</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchStudents} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estudiantes</h1>
          <p className="text-gray-600">Gestiona la información de todos los estudiantes</p>
        </div>

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Estudiante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Estudiante</DialogTitle>
              <DialogDescription>
                Completa los datos del nuevo estudiante
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Apellido</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@usuario"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notas</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  Crear Estudiante
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspendido</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Estudiantes</CardTitle>
          <CardDescription>
            {students.length} estudiantes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Nombre
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Paquetes Activos</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('totalSpent')}
                    >
                      <div className="flex items-center gap-2">
                        Total Gastado
                        {getSortIcon('totalSpent')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        Registrado
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{student.activePackages}</Badge>
                          {student.activePackages > 0 && (
                            <Package className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(student.totalSpent)}
                      </TableCell>
                      <TableCell>{formatDate(student.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {student.status === 'PENDING_ACTIVATION' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                              onClick={() => handleActivateUser(student.id)}
                              title="Activar Usuario"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              fetchStudentDetails(student.id)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFormData({
                                firstName: student.firstName,
                                lastName: student.lastName,
                                email: student.email,
                                phone: student.phone || '',
                                instagram: student.instagram || '',
                                notes: student.notes || '',
                                status: student.status
                              })
                              setSelectedStudent(student as any)
                              setShowEditForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Cargando...'}
            </DialogTitle>
            <DialogDescription>
              Información completa del estudiante
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : selectedStudent ? (
            <div className="space-y-6">
              {/* Student Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Personal</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p>{selectedStudent.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Teléfono</label>
                    <p>{selectedStudent.phone || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Instagram</label>
                    <p>{selectedStudent.instagram || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado</label>
                    <div>{getStatusBadge(selectedStudent.status)}</div>
                  </div>
                  {selectedStudent.notes && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Notas</label>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedStudent.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metrics */}
              {selectedStudent.metrics ? (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-orange-600">
                        {selectedStudent.metrics.totalCreditsRemaining}
                      </div>
                      <p className="text-sm text-gray-600">Créditos Restantes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedStudent.metrics.attendedClasses}
                      </div>
                      <p className="text-sm text-gray-600">Clases Asistidas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(selectedStudent.metrics.totalSpent)}
                      </div>
                      <p className="text-sm text-gray-600">Total Gastado</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-gray-400">
                        --
                      </div>
                      <p className="text-sm text-gray-600">Créditos Restantes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-gray-400">
                        --
                      </div>
                      <p className="text-sm text-gray-600">Clases Asistidas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-gray-400">
                        --
                      </div>
                      <p className="text-sm text-gray-600">Total Gastado</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Packages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Paquetes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedStudent.packages && selectedStudent.packages.length > 0 ? (
                      selectedStudent.packages.map((pkg) => (
                        <div key={pkg.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-gray-600">
                              {pkg.usedCredits}/{pkg.totalCredits} créditos usados
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={pkg.status === 'ACTIVE' ? 'success' : 'secondary'}>
                              {pkg.status}
                            </Badge>
                            <span className="font-medium">{formatCurrency(pkg.price)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay paquetes disponibles</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
            <DialogDescription>
              Modifica los datos del estudiante
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Instagram</label>
              <Input
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@usuario"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}