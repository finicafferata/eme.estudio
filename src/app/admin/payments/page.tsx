'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Plus, Search, Filter, Eye, DollarSign, TrendingUp, CreditCard, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// EME Studio Payment Methods
const PAYMENT_METHODS = {
  cash_pesos: {
    name: 'Cash Pesos',
    displayName: 'Efectivo Pesos',
    currency: 'ARS'
  },
  cash_usd: {
    name: 'Cash USD',
    displayName: 'Efectivo USD',
    currency: 'USD'
  },
  transfer_meri_pesos: {
    name: 'Transfer to Meri Pesos',
    displayName: 'Transferencia a Meri Pesos',
    currency: 'ARS'
  },
  transfer_male_pesos: {
    name: 'Transfer to Male Pesos',
    displayName: 'Transferencia a Male Pesos',
    currency: 'ARS'
  },
  transfer_usd: {
    name: 'Transfer in USD',
    displayName: 'Transferencia USD',
    currency: 'USD'
  }
}

interface PaymentOverview {
  totals: {
    revenuePesos: number
    revenueUSD: number
    thisMonthPesos: number
    thisMonthUSD: number
    thisYearPesos: number
    thisYearUSD: number
    monthlyGrowth: number
  }
  paymentMethods: Array<{
    method: string
    methodInfo: any
    count: number
    totalAmount: number
    thisMonthAmount: number
    thisMonthCount: number
  }>
  pendingPayments: {
    count: number
    totalAmount: number
    payments: Array<{
      id: string
      amount: number
      currency: string
      studentName: string
      packageName: string
      createdAt: string
    }>
  }
  monthlyTrends: Array<{
    month: string
    revenuePesos: number
    revenueUSD: number
    paymentCount: number
  }>
  summary: {
    totalPayments: number
    thisMonthPayments: number
    thisYearPayments: number
    averagePaymentAmount: number
  }
}

interface Payment {
  id: string
  amount: number
  currency: string
  paymentMethod: string
  paymentMethodInfo: any
  status: string
  description: string
  notes: string
  createdAt: string
  paidAt: string
  student: {
    id: string
    name: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  package: {
    id: string
    name: string
    totalCredits: number
    usedCredits: number
    price: number
    status: string
    classType: {
      name: string
      color: string
    }
  } | null
}

interface Student {
  id: string
  name: string
  email: string
  packages: Array<{
    id: string
    name: string
    price: number
    totalPaid: number
    remainingBalance: number
    allowsPartialPayments: boolean
  }>
}

export default function PaymentsPage() {
  const [overview, setOverview] = useState<PaymentOverview | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  // Record Payment Modal
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('ARS')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentNotes, setPaymentNotes] = useState('')
  const [markAsFullyPaid, setMarkAsFullyPaid] = useState(false)

  // Payment Details Modal
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString()}`
    }
    return `$${amount.toLocaleString()} ARS`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REFUNDED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/overview')
      if (response.ok) {
        const data = await response.json()
        setOverview(data)
      }
    } catch (error) {
      console.error('Error loading overview:', error)
    }
  }, [])

  const loadPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(search && { search }),
        ...(paymentMethodFilter && paymentMethodFilter !== 'all' && { paymentMethod: paymentMethodFilter }),
        ...(currencyFilter && currencyFilter !== 'all' && { currency: currencyFilter }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() })
      })

      const response = await fetch(`/api/payments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    }
  }, [currentPage, search, paymentMethodFilter, currencyFilter, statusFilter, startDate, endDate])

  const loadStudents = useCallback(async () => {
    try {
      const response = await fetch('/api/students')
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }, [])

  const handleRecordPayment = async () => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          packageId: selectedPackage || null,
          amount: parseFloat(paymentAmount),
          currency: paymentCurrency,
          paymentMethod,
          notes: paymentNotes,
          paidAt: paymentDate.toISOString(),
          markAsFullyPaid
        })
      })

      if (response.ok) {
        setRecordPaymentOpen(false)
        resetRecordPaymentForm()
        loadOverview()
        loadPayments()
      }
    } catch (error) {
      console.error('Error recording payment:', error)
    }
  }

  const resetRecordPaymentForm = () => {
    setSelectedStudent('')
    setSelectedPackage('')
    setPaymentAmount('')
    setPaymentCurrency('ARS')
    setPaymentMethod('')
    setPaymentDate(new Date())
    setPaymentNotes('')
    setMarkAsFullyPaid(false)
  }

  const viewPaymentDetails = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedPayment(data)
        setPaymentDetailsOpen(true)
      }
    } catch (error) {
      console.error('Error loading payment details:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadOverview(), loadPayments(), loadStudents()])
      setLoading(false)
    }
    loadData()
  }, [loadOverview, loadPayments, loadStudents])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (search !== undefined) {
        loadPayments()
      }
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [loadPayments, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const selectedStudentData = students.find(s => s.id === selectedStudent)
  const selectedPackageData = selectedStudentData?.packages.find(p => p.id === selectedPackage)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-muted-foreground">Track revenue, manage payments, and monitor financial performance</p>
        </div>
        <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Record a payment for a student. Select the student and package if applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student">Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package">Package (Optional)</Label>
                  <Select
                    value={selectedPackage}
                    onValueChange={setSelectedPackage}
                    disabled={!selectedStudent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedStudentData?.packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - {formatCurrency(pkg.remainingBalance, 'ARS')} remaining
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPackageData && (
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Package Price:</span>
                        <span>{formatCurrency(selectedPackageData.price, 'ARS')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Already Paid:</span>
                        <span>{formatCurrency(selectedPackageData.totalPaid, 'ARS')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Remaining Balance:</span>
                        <span>{formatCurrency(selectedPackageData.remainingBalance, 'ARS')}</span>
                      </div>
                      <Progress
                        value={(selectedPackageData.totalPaid / selectedPackageData.price) * 100}
                        className="h-2"
                      />
                      {!selectedPackageData.allowsPartialPayments && selectedPackageData.remainingBalance > 0 && (
                        <p className="text-sm text-orange-600">
                          This package requires full payment
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  {selectedPackageData && parseFloat(paymentAmount) > selectedPackageData.remainingBalance && (
                    <p className="text-sm text-red-600">
                      Amount exceeds remaining balance
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                      <SelectItem value="USD">USD (Dollars)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHODS)
                      .filter(([key, method]) => method.currency === paymentCurrency)
                      .map(([key, method]) => (
                        <SelectItem key={key} value={key}>
                          {method.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => date && setPaymentDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add payment notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              {selectedPackage && (
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="markAsFullyPaid"
                    checked={markAsFullyPaid}
                    onCheckedChange={(checked) => setMarkAsFullyPaid(checked === true)}
                  />
                  <Label htmlFor="markAsFullyPaid" className="text-sm font-medium">
                    Mark package as fully paid
                  </Label>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={!selectedStudent || !paymentAmount || !paymentMethod}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue (Pesos)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totals.revenuePesos, 'ARS')}</div>
              <p className="text-xs text-muted-foreground">
                {overview.summary.totalPayments} total payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue (USD)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totals.revenueUSD, 'USD')}</div>
              <p className="text-xs text-muted-foreground">
                Average: {formatCurrency(overview.summary.averagePaymentAmount, 'ARS')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totals.thisMonthPesos, 'ARS')}</div>
              <p className="text-xs text-muted-foreground">
                {overview.totals.monthlyGrowth > 0 ? '+' : ''}{overview.totals.monthlyGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.pendingPayments.count}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(overview.pendingPayments.totalAmount, 'ARS')} pending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Methods Breakdown */}
      {overview && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Breakdown</CardTitle>
            <CardDescription>Revenue by payment method for this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overview.paymentMethods.map((method) => (
                <div key={method.method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{method.methodInfo.displayName}</span>
                    <Badge variant="secondary">{method.thisMonthCount}</Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(method.thisMonthAmount, method.methodInfo.currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(method.totalAmount, method.methodInfo.currency)} ({method.count} payments)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>View and manage all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                    <SelectItem key={key} value={key}>
                      {method.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Label>From:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MM/dd") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2">
                <Label>To:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MM/dd") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(search || (paymentMethodFilter && paymentMethodFilter !== 'all') || (currencyFilter && currencyFilter !== 'all') || (statusFilter && statusFilter !== 'all') || startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setPaymentMethodFilter('all')
                    setCurrencyFilter('all')
                    setStatusFilter('all')
                    setStartDate(undefined)
                    setEndDate(undefined)
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paidAt ? format(new Date(payment.paidAt), 'MMM dd, yyyy') : format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.student.name}</div>
                        <div className="text-sm text-muted-foreground">{payment.student.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.paymentMethodInfo.displayName}</div>
                        <div className="text-sm text-muted-foreground">{payment.currency}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.package ? (
                        <div>
                          <div className="font-medium">{payment.package.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.package.classType?.name || 'General'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No package</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewPaymentDetails(payment.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} payments
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      <Dialog open={paymentDetailsOpen} onOpenChange={setPaymentDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete payment information and history
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Payment ID</Label>
                  <p className="text-sm">{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div>
                    <Badge className={getStatusColor(selectedPayment.status)}>
                      {selectedPayment.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm">{selectedPayment.paymentMethodInfo.displayName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Date</Label>
                  <p className="text-sm">
                    {selectedPayment.paidAt ? format(new Date(selectedPayment.paidAt), 'PPP') : 'Not paid'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created Date</Label>
                  <p className="text-sm">{format(new Date(selectedPayment.createdAt), 'PPP')}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Student Information</Label>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedPayment.student.name}</p>
                      <p><strong>Email:</strong> {selectedPayment.student.email}</p>
                      {selectedPayment.student.phone && (
                        <p><strong>Phone:</strong> {selectedPayment.student.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedPayment.package && (
                <div>
                  <Label className="text-sm font-medium">Package Information</Label>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p><strong>Package:</strong> {selectedPayment.package.name}</p>
                        <p><strong>Class Type:</strong> {selectedPayment.package.classType.name}</p>
                        <p><strong>Total Credits:</strong> {selectedPayment.package.totalCredits}</p>
                        <p><strong>Used Credits:</strong> {selectedPayment.package.usedCredits}</p>
                        <p><strong>Remaining Credits:</strong> {selectedPayment.package.totalCredits - selectedPayment.package.usedCredits}</p>
                        <p><strong>Package Price:</strong> {formatCurrency(selectedPayment.package.price, 'ARS')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedPayment.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{selectedPayment.description}</p>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm mt-1">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}