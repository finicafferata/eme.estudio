'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Edit, Search, Filter, Package, TrendingUp, TrendingDown, Calendar, DollarSign, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

// EME Studio Package Types
const PACKAGE_TYPES = {
  INTENSIVO: {
    name: 'Intensivo',
    credits: 3,
    price: 145000,
    color: '#f97316'
  },
  RECURRENTE: {
    name: 'Recurrente',
    credits: 4,
    price: 170000,
    color: '#3b82f6'
  }
}

interface PackageData {
  id: string
  name: string
  status: string
  effectiveStatus: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  usagePercentage: number
  price: number
  purchasedAt: string
  expiresAt?: string
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiry?: number
  notes?: string
  student: {
    id: string
    name: string
    email: string
  }
  classType?: {
    name: string
    color: string
  }
  payments: {
    totalPaid: number
    totalDue: number
    isFullyPaid: boolean
  }
}

interface PackageTypeStats {
  packageType: string
  counts: {
    active: number
    expired: number
    usedUp: number
    expiringSoon: number
    total: number
  }
  revenue: {
    total: number
    thisMonth: number
    growth: number
  }
  utilization: {
    averagePercentage: number
    remainingCredits: number
  }
}

interface PackagesResponse {
  packages: PackageData[]
  totalCount: number
  currentPage: number
  totalPages: number
}

interface PackageTypesResponse {
  packageTypes: any[]
  statistics: PackageTypeStats[]
  summary: {
    totalActivePackages: number
    totalRevenue: number
    monthlyRevenue: number
    monthlyGrowth: number
  }
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [packageStats, setPackageStats] = useState<PackageTypesResponse | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [packageTypeFilter, setPackageTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('purchasedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal states
  const [showDetails, setShowDetails] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Form state for creating packages
  const [createForm, setCreateForm] = useState({
    studentId: '',
    packageType: 'INTENSIVO',
    paymentAmount: '',
    paymentMethod: 'CASH_PESOS',
    notes: ''
  })

  // Form state for recording payments
  const [paymentForm, setPaymentForm] = useState({
    packageId: '',
    amount: 0,
    paymentMethod: 'CASH_PESOS',
    notes: ''
  })

  const [students, setStudents] = useState<any[]>([])

  const fetchPackageStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/packages/types?includeStats=true')
      if (!response.ok) throw new Error('Failed to fetch package statistics')

      const data = await response.json()
      setPackageStats(data)
    } catch (err) {
      console.error('Failed to fetch package stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '20',
        ...(packageTypeFilter && { packageType: packageTypeFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter })
      })

      const response = await fetch(`/api/packages?${params}`)
      if (!response.ok) throw new Error('Failed to fetch packages')

      const data: PackagesResponse = await response.json()
      setPackages(data.packages)
      setTotalPages(data.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [packageTypeFilter, statusFilter, paymentStatusFilter, sortBy, sortOrder, currentPage])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?limit=1000')
      if (!response.ok) throw new Error('Failed to fetch students')

      const data = await response.json()
      setStudents(data.students)
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
  }

  const fetchPackageDetails = async (packageId: string) => {
    try {
      const response = await fetch(`/api/packages/${packageId}`)
      if (!response.ok) throw new Error('Failed to fetch package details')

      const data = await response.json()
      setSelectedPackage(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch package details')
    }
  }

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create package')
      }

      setShowCreateForm(false)
      setCreateForm({
        studentId: '',
        packageType: 'INTENSIVO',
        paymentAmount: '',
        paymentMethod: 'CASH_PESOS',
        notes: ''
      })
      fetchPackages()
      fetchPackageStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package')
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: paymentForm.packageId,
          amount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          userId: selectedPackage?.student.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record payment')
      }

      // Close payment modal and refresh data
      setShowPaymentModal(false)

      // Reset payment form
      setPaymentForm({
        packageId: '',
        amount: 0,
        paymentMethod: 'CASH_PESOS',
        notes: ''
      })

      // Refresh packages data
      await fetchPackages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    }
  }

  const getStatusBadge = (pkg: PackageData) => {
    const status = pkg.effectiveStatus || pkg.status
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Activo</Badge>
      case 'EXPIRED':
        return <Badge variant="destructive">Vencido</Badge>
      case 'EXPIRING_SOON':
        return <Badge variant="warning">Por Vencer</Badge>
      case 'USED_UP':
        return <Badge variant="secondary">Agotado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (payments: any) => {
    if (payments.isFullyPaid) {
      return <Badge variant="success">Pagado</Badge>
    } else if (payments.totalPaid > 0) {
      return <Badge variant="warning">Parcial</Badge>
    } else {
      return <Badge variant="destructive">Pendiente</Badge>
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

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  useEffect(() => {
    fetchPackageStats()
    fetchStudents()
  }, [])

  // Update selected package when packages data changes
  useEffect(() => {
    if (selectedPackage && packages.length > 0) {
      const updatedPackage = packages.find(p => p.id === selectedPackage.id)
      if (updatedPackage) {
        setSelectedPackage(updatedPackage)
      }
    }
  }, [packages, selectedPackage])

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => { fetchPackages(); fetchPackageStats() }} className="mt-4">
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Paquetes</h1>
          <p className="text-gray-600">Administra los paquetes Intensivo y Recurrente de EME Studio</p>
        </div>

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paquete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Paquete</DialogTitle>
              <DialogDescription>
                Configura un nuevo paquete para un estudiante
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Estudiante</label>
                <select
                  value={createForm.studentId}
                  onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                >
                  <option value="">Seleccionar estudiante</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} - {student.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Paquete</label>
                <select
                  value={createForm.packageType}
                  onChange={(e) => setCreateForm({ ...createForm, packageType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="INTENSIVO">Intensivo (3 clases - {formatCurrency(145000)})</option>
                  <option value="RECURRENTE">Recurrente (4 clases - {formatCurrency(170000)})</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Monto del Pago Inicial</label>
                <Input
                  type="number"
                  value={createForm.paymentAmount}
                  onChange={(e) => setCreateForm({ ...createForm, paymentAmount: e.target.value })}
                  placeholder="Monto en pesos"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {createForm.packageType === 'RECURRENTE' && 'Recurrente requiere pago completo'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Método de Pago</label>
                <select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="CASH_PESOS">Efectivo (Pesos)</option>
                  <option value="CASH_USD">Efectivo (USD)</option>
                  <option value="TRANSFER_TO_MERI_PESOS">Transferencia a Meri (Pesos)</option>
                  <option value="TRANSFER_TO_MALE_PESOS">Transferencia a Male (Pesos)</option>
                  <option value="TRANSFER_IN_USD">Transferencia (USD)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Notas</label>
                <Input
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  Crear Paquete
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Package Type Overview Cards */}
      {!statsLoading && packageStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paquetes Activos</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{packageStats.summary.totalActivePackages}</div>
              <p className="text-xs text-muted-foreground">
                Total de paquetes activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                {packageStats.summary.monthlyGrowth > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(packageStats.summary.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {packageStats.summary.monthlyGrowth >= 0 ? '+' : ''}{packageStats.summary.monthlyGrowth.toFixed(1)}% vs mes anterior
              </p>
            </CardContent>
          </Card>

          {packageStats.statistics.map((stat) => {
            const config = PACKAGE_TYPES[stat.packageType as keyof typeof PACKAGE_TYPES]
            return (
              <Card key={stat.packageType}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paquetes {config.name}</CardTitle>
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.counts.active}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.utilization.averagePercentage}% utilización promedio
                  </p>
                  <div className="mt-2">
                    <Progress
                      value={stat.utilization.averagePercentage}
                      className="h-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar paquetes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={packageTypeFilter}
                onChange={(e) => setPackageTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Todos los tipos</option>
                <option value="Intensivo">Intensivo</option>
                <option value="Recurrente">Recurrente</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="EXPIRED">Vencidos</option>
                <option value="USED_UP">Agotados</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Estado de pago</option>
                <option value="COMPLETED">Pagados</option>
                <option value="PENDING">Pendientes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Paquetes</CardTitle>
          <CardDescription>
            {packages.length} paquetes encontrados
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
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{pkg.student.name}</div>
                          <div className="text-sm text-gray-500">{pkg.student.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: pkg.name === 'Intensivo' ? '#f97316' : '#3b82f6'
                            }}
                          />
                          {pkg.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{pkg.usedCredits}/{pkg.totalCredits}</span>
                            <span>{pkg.usagePercentage}%</span>
                          </div>
                          <Progress value={pkg.usagePercentage} className="h-1" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(pkg)}</TableCell>
                      <TableCell>
                        {pkg.expiresAt ? (
                          <div>
                            <div className="text-sm">{formatDate(pkg.expiresAt)}</div>
                            {pkg.daysUntilExpiry !== null && (
                              <div className={`text-xs ${pkg.isExpiringSoon ? 'text-orange-600' : 'text-gray-500'}`}>
                                {(pkg.daysUntilExpiry ?? 0) > 0 ? `${pkg.daysUntilExpiry} días` : 'Vencido'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Sin vencimiento</span>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(pkg.payments)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(pkg.price)}</div>
                          {!pkg.payments.isFullyPaid && (
                            <div className="text-xs text-red-600">
                              Debe: {formatCurrency(pkg.payments.totalDue)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              fetchPackageDetails(pkg.id)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
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

      {/* Package Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPackage ? `${selectedPackage.name} - ${selectedPackage.student.name}` : 'Cargando...'}
            </DialogTitle>
            <DialogDescription>
              Información completa del paquete
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-6">
              {/* Package Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedPackage.remainingCredits}
                    </div>
                    <p className="text-sm text-gray-600">Créditos Restantes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedPackage.classHistory?.filter(reservation =>
                        reservation.status === 'CHECKED_IN' || reservation.status === 'COMPLETED'
                      ).length || 0}
                    </div>
                    <p className="text-sm text-gray-600">Clases Asistidas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedPackage.payments.totalPaid)}
                    </div>
                    <p className="text-sm text-gray-600">Pagado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedPackage.daysUntilExpiry || 0}
                    </div>
                    <p className="text-sm text-gray-600">Días Restantes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Información de Pagos</CardTitle>
                  <Button
                    onClick={() => {
                      setShowPaymentModal(true);
                      setPaymentForm({
                        packageId: selectedPackage.id,
                        amount: selectedPackage.payments.totalDue,
                        paymentMethod: 'CASH_PESOS',
                        notes: ''
                      });
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar Pago
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedPackage.payments.payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                          <div className="text-sm text-gray-600">
                            {payment.paymentMethod} - {formatDate(payment.paidAt)}
                          </div>
                        </div>
                        <Badge variant={payment.status === 'COMPLETED' ? 'success' : 'warning'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Class History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historial de Clases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedPackage.classHistory.map((classItem: any) => (
                      <div key={classItem.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{classItem.class.className}</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(classItem.class.startsAt)} - {classItem.class.instructor}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={classItem.status === 'CHECKED_IN' ? 'success' : 'secondary'}>
                            {classItem.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {classItem.creditsUsed} crédito{classItem.creditsUsed > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Recording Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Monto a Pagar</label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                placeholder="Ingrese el monto..."
                required
                className="mt-1"
              />
              {selectedPackage && (
                <p className="text-sm text-gray-600 mt-1">
                  Saldo pendiente: {formatCurrency(selectedPackage.payments.totalDue)}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Método de Pago</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"
                required
              >
                <option value="CASH_PESOS">Efectivo (Pesos)</option>
                <option value="CASH_USD">Efectivo (USD)</option>
                <option value="TRANSFER_TO_MERI_PESOS">Transferencia a Meri (Pesos)</option>
                <option value="TRANSFER_TO_MALE_PESOS">Transferencia a Male (Pesos)</option>
                <option value="TRANSFER_IN_USD">Transferencia (USD)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Notas (Opcional)</label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}