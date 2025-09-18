'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  CreditCard,
  MapPin,
  BookOpen,
  Target,
  Star,
  Play,
  UserPlus,
  ShoppingBag,
  Plus,
  UserCheck,
  Receipt,
  CalendarCheck,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  ArrowRight,
  Timer,
  Award,
  Sunrise,
  Sun,
  Moon
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts'

interface DashboardStats {
  overview: {
    totalStudents: number
    studentsTrend?: number
    activePackages: number
    packagesTrend?: number
    thisWeekClasses: number
    classesTrend?: number
    monthlyRevenue: {
      usd: number
      pesos: number
      totalPesos: number
    }
    revenueTrend: number
  }
  charts: {
    packageDistribution: Array<{ name: string; count: number }>
    paymentMethods: Array<{ method: string; count: number; amount: number }>
    popularClassTimes: Array<{ time: string; count: number }>
    revenueHistory?: Array<{ month: string; revenue: number }>
  }
  metrics: {
    avgPackageUtilization: number
  }
}

interface DashboardActivity {
  recentPayments: Array<{
    id: string
    studentName: string
    amount: number
    currency: string
    paymentMethod: string
    paidAt: string
    type: 'payment'
  }>
  recentPackages: Array<{
    id: string
    studentName: string
    packageName: string
    classType: string
    totalCredits: number
    price: number
    purchasedAt: string
    type: 'package_purchase'
  }>
  upcomingClasses: Array<{
    id: string
    className: string
    instructorName: string
    locationName: string
    startsAt: string
    studentCount: number
    capacity: number
    students: string[]
    type: 'upcoming_class'
  }>
  newStudents: Array<{
    id: string
    name: string
    email: string
    createdAt: string
    type: 'new_student'
  }>
  todaysClasses: Array<{
    id: string
    className: string
    instructorName: string
    locationName: string
    startsAt: string
    studentCount: number
    capacity: number
    students: string[]
    type: 'todays_class'
  }>
}

function formatCurrency(amount: number, currency: 'ARS' | 'USD' = 'ARS') {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount)
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const targetDate = new Date(date)
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
  return targetDate.toLocaleDateString('es-AR')
}

function getTimeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { greeting: '¡Buen día', icon: Sunrise }
  if (hour < 18) return { greeting: '¡Buena tarde', icon: Sun }
  return { greeting: '¡Buena noche', icon: Moon }
}

function formatPaymentMethod(method: string) {
  const methods: Record<string, string> = {
    'CASH_PESOS': 'Efectivo AR$',
    'CASH_USD': 'Efectivo USD',
    'TRANSFER_TO_MERI_PESOS': 'Transferencia Meri',
    'TRANSFER_TO_MALE_PESOS': 'Transferencia Male',
    'TRANSFER_IN_USD': 'Transferencia USD'
  }
  return methods[method] || method
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
}

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<DashboardActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('🚀 Fetching dashboard data...')
        const [statsResponse, activityResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/recent-activity')
        ])

        console.log('📊 Stats response:', statsResponse.status)
        console.log('⚡ Activity response:', activityResponse.status)

        if (!statsResponse.ok || !activityResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const statsData = await statsResponse.json()
        const activityData = await activityResponse.json()

        console.log('✅ Stats data:', statsData)
        console.log('✅ Activity data:', activityData)

        // Add mock trend data if not provided
        statsData.overview.studentsTrend = statsData.overview.studentsTrend ?? 12.5
        statsData.overview.packagesTrend = statsData.overview.packagesTrend ?? 8.3
        statsData.overview.classesTrend = statsData.overview.classesTrend ?? -5.2

        setStats(statsData)
        setActivity(activityData)
        console.log('✅ Dashboard state updated!')
      } catch (err) {
        console.error('❌ Dashboard error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
        console.log('🏁 Dashboard loading complete')
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Header Skeleton */}
          <div className="space-y-4">
            <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl w-1/3 animate-pulse"></div>
            <div className="h-5 bg-gray-200 rounded-lg w-1/4 animate-pulse"></div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="h-40 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg animate-pulse"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar el dashboard</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Intentar de nuevo
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  const userName = session?.user?.name || 'Usuario'
  const firstName = userName.split(' ')[0]
  const { greeting, icon: GreetingIcon } = getTimeOfDayGreeting()

  // Debug info
  console.log('🔍 Dashboard render state:', { loading, error, stats: !!stats, activity: !!activity, session: !!session })

  // Enhanced color palette
  const COLORS = {
    primary: '#6366f1',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    purple: '#8b5cf6',
    emerald: '#10b981',
    orange: '#f97316'
  }

  const chartColors = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.purple]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <motion.div
        className="max-w-7xl mx-auto p-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Welcome Section */}
        <motion.div
          className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-3xl shadow-2xl"
          variants={itemVariants}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 to-blue-600/90"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          </div>

          <div className="relative px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <motion.div
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <GreetingIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">
                      {greeting}, {firstName}!
                    </h1>
                    <p className="text-blue-100 text-lg font-medium">
                      Bienvenido al centro de control de EME Estudio
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex items-center space-x-6 text-white/90"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">
                      {new Date().toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>Todo listo para un gran día</span>
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  className="flex items-center space-x-4 pt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Paquete
                  </Button>
                  <Button
                    className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Estudiante
                  </Button>
                  <Button
                    className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm"
                    variant="outline"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                </motion.div>
              </div>

              <motion.div
                className="hidden lg:block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <Award className="h-16 w-16 text-white/80" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Metrics Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={itemVariants}
        >
          {/* Active Students */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-blue-500/10 bg-gradient-to-br from-white to-blue-50/50">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {(stats?.overview.studentsTrend || 0) > 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold text-sm">
                          +{stats?.overview.studentsTrend?.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-semibold text-sm">
                          {stats?.overview.studentsTrend?.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.overview.totalStudents || 0}
                  </h3>
                  <p className="text-gray-600 font-medium">Estudiantes Activos</p>
                  <p className="text-xs text-gray-500">
                    vs mes anterior
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Packages */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-emerald-500/10 bg-gradient-to-br from-white to-emerald-50/50">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5"></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {(stats?.overview.packagesTrend || 0) > 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold text-sm">
                          +{stats?.overview.packagesTrend?.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-semibold text-sm">
                          {stats?.overview.packagesTrend?.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.overview.activePackages || 0}
                  </h3>
                  <p className="text-gray-600 font-medium">Paquetes Activos</p>
                  <p className="text-xs text-gray-500">
                    Con créditos disponibles
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Classes */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-purple-500/10 bg-gradient-to-br from-white to-purple-50/50">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5"></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {(stats?.overview.classesTrend || 0) > 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold text-sm">
                          +{stats?.overview.classesTrend?.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-semibold text-sm">
                          {stats?.overview.classesTrend?.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {stats?.overview.thisWeekClasses || 0}
                  </h3>
                  <p className="text-gray-600 font-medium">Clases Esta Semana</p>
                  <p className="text-xs text-gray-500">
                    Programadas y confirmadas
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Revenue */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-orange-500/10 bg-gradient-to-br from-white to-orange-50/50">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5"></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {(stats?.overview.revenueTrend || 0) > 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold text-sm">
                          +{stats?.overview.revenueTrend?.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-semibold text-sm">
                          {stats?.overview.revenueTrend?.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.overview.monthlyRevenue?.totalPesos || 0)}
                  </h3>
                  <p className="text-gray-600 font-medium">Ingresos del Mes</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(stats?.overview.monthlyRevenue?.usd || 0, 'USD')} en USD
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Key Metrics Overview */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={itemVariants}
        >
          <motion.div variants={cardVariants} whileHover="hover" className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <span>Métricas de Rendimiento</span>
                    </CardTitle>
                    <CardDescription className="mt-2">Indicadores clave del negocio</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                    Tiempo real
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {stats?.metrics.avgPackageUtilization || 0}%
                    </div>
                    <p className="text-sm font-medium text-gray-600">Utilización de Paquetes</p>
                    <Progress
                      value={stats?.metrics.avgPackageUtilization || 0}
                      className="h-3 bg-gray-100"
                    />
                  </div>

                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/25">
                      <CreditCard className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(stats?.overview.monthlyRevenue?.usd || 0, 'USD')}
                    </div>
                    <p className="text-sm font-medium text-gray-600">Ingresos USD</p>
                    <div className="text-xs text-gray-500">Este mes</div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/25">
                      <CalendarCheck className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {activity?.todaysClasses?.length || 0}
                    </div>
                    <p className="text-sm font-medium text-gray-600">Clases Hoy</p>
                    <div className="text-xs text-gray-500">Programadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions Panel */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span>Acciones Rápidas</span>
                </CardTitle>
                <CardDescription>Gestión diaria del estudio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25" size="lg">
                  <Plus className="h-4 w-4 mr-3" />
                  Crear Nuevo Paquete
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <Button variant="outline" className="w-full justify-start border-2 hover:bg-emerald-50 hover:border-emerald-200" size="lg">
                  <UserPlus className="h-4 w-4 mr-3 text-emerald-600" />
                  Agregar Estudiante
                  <ArrowRight className="h-4 w-4 ml-auto text-emerald-600" />
                </Button>

                <Button variant="outline" className="w-full justify-start border-2 hover:bg-purple-50 hover:border-purple-200" size="lg">
                  <Receipt className="h-4 w-4 mr-3 text-purple-600" />
                  Registrar Pago
                  <ArrowRight className="h-4 w-4 ml-auto text-purple-600" />
                </Button>

                <Button variant="outline" className="w-full justify-start border-2 hover:bg-orange-50 hover:border-orange-200" size="lg">
                  <Calendar className="h-4 w-4 mr-3 text-orange-600" />
                  Ver Clases Hoy
                  <ArrowRight className="h-4 w-4 ml-auto text-orange-600" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts Section */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          variants={itemVariants}
        >
          {/* Package Distribution */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  <span>Distribución de Paquetes</span>
                </CardTitle>
                <CardDescription>Intensivo vs Recurrente</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={stats?.charts.packageDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(stats?.charts.packageDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Methods */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-emerald-50/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <span>Métodos de Pago</span>
                </CardTitle>
                <CardDescription>Distribución este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats?.charts.paymentMethods?.map(pm => ({ ...pm, method: formatPaymentMethod(pm.method) })) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="method" fontSize={10} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Cantidad' : 'Monto']} />
                    <Bar dataKey="count" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Popular Class Times */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span>Horarios Populares</span>
                </CardTitle>
                <CardDescription>Clases más demandadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.charts.popularClassTimes?.slice(0, 5).map((time, index) => (
                    <div key={`class-time-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                          index === 0 ? 'from-purple-500 to-purple-600' :
                          index === 1 ? 'from-blue-500 to-blue-600' :
                          index === 2 ? 'from-emerald-500 to-emerald-600' :
                          'from-gray-400 to-gray-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900">{time.time}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${
                          index === 0 ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          index === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          index === 2 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {time.count} clases
                      </Badge>
                    </div>
                  )) || <p className="text-sm text-gray-500">No hay datos</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Today's Schedule */}
        <motion.div variants={itemVariants}>
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3 text-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Play className="h-5 w-5 text-white" />
                      </div>
                      <span>Horario de Hoy</span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {activity?.todaysClasses?.length || 0} clase{activity?.todaysClasses?.length !== 1 ? 's' : ''} programada{activity?.todaysClasses?.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Activity className="h-3 w-3 mr-1" />
                      En vivo
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activity?.todaysClasses && activity.todaysClasses.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-slate-50">
                          <TableHead className="font-semibold">Hora</TableHead>
                          <TableHead className="font-semibold">Clase</TableHead>
                          <TableHead className="font-semibold">Instructor</TableHead>
                          <TableHead className="font-semibold">Ubicación</TableHead>
                          <TableHead className="font-semibold">Estudiantes</TableHead>
                          <TableHead className="font-semibold">Ocupación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activity.todaysClasses.map((cls) => (
                          <TableRow key={cls.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Timer className="h-4 w-4 text-blue-500" />
                                <span>
                                  {new Date(cls.startsAt).toLocaleTimeString('es-AR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-900">{cls.className}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-purple-500" />
                                <span>{cls.instructorName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-emerald-500" />
                                <span>{cls.locationName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {cls.students.length > 0 ? cls.students.map((student, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs mr-1 bg-blue-50 border-blue-200 text-blue-700">
                                    {student}
                                  </Badge>
                                )) : (
                                  <span className="text-sm text-gray-500 italic">Sin reservas</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium">{cls.studentCount}/{cls.capacity}</span>
                                <div className="flex-1 max-w-20">
                                  <Progress
                                    value={(cls.studentCount / cls.capacity) * 100}
                                    className="h-2"
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {Math.round((cls.studentCount / cls.capacity) * 100)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clases hoy</h3>
                    <p className="text-gray-500 mb-6">Aprovecha para planificar las próximas semanas</p>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                      <Plus className="h-4 w-4 mr-2" />
                      Programar Clase
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={itemVariants}
        >
          {/* Recent Activity */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <span>Actividad Reciente</span>
                </CardTitle>
                <CardDescription>Últimos eventos importantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* New Students */}
                  {activity?.newStudents?.slice(0, 2).map((student) => (
                    <motion.div
                      key={student.id}
                      className="flex items-start space-x-4 p-4 bg-blue-50 rounded-2xl border border-blue-100"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <UserPlus className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {student.name} se registró como estudiante
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRelativeTime(student.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Recent Payments */}
                  {activity?.recentPayments?.slice(0, 2).map((payment) => (
                    <motion.div
                      key={payment.id}
                      className="flex items-start space-x-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {payment.studentName} completó pago de {formatCurrency(payment.amount, payment.currency as 'ARS' | 'USD')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatRelativeTime(payment.paidAt)} • {formatPaymentMethod(payment.paymentMethod)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Packages */}
          <motion.div variants={cardVariants} whileHover="hover">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <span>Compras Recientes</span>
                </CardTitle>
                <CardDescription>Últimos paquetes adquiridos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activity?.recentPackages && activity.recentPackages.length > 0 ? (
                    activity.recentPackages.slice(0, 4).map((pkg) => (
                      <motion.div
                        key={pkg.id}
                        className="flex items-start space-x-4 p-4 bg-purple-50 rounded-2xl border border-purple-100"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {pkg.studentName} compró {pkg.packageName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(pkg.purchasedAt)} • {pkg.totalCredits} créditos • {formatCurrency(pkg.price)}
                          </p>
                          <Badge variant="outline" className="text-xs mt-2 bg-white border-purple-200 text-purple-700">
                            {pkg.classType}
                          </Badge>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No hay compras recientes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}