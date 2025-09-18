'use client'

import { useState, useEffect } from 'react'
import { CreditCard, TrendingUp, Package } from 'lucide-react'

interface DashboardData {
  totalActiveCredits: number
  activePackagesCount: number
  totalCreditsUsed: number
  upcomingReservationsCount: number
}

export default function StudentDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalActiveCredits: 0,
    activePackagesCount: 0,
    totalCreditsUsed: 0,
    upcomingReservationsCount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load credit summary
        const creditsResponse = await fetch('/api/student/credits')
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json()
          setDashboardData(prev => ({
            ...prev,
            totalActiveCredits: creditsData.summary.totalActiveCredits,
            activePackagesCount: creditsData.summary.activePackagesCount,
            totalCreditsUsed: creditsData.summary.totalCreditsUsed
          }))
        }

        // Load upcoming reservations count
        const reservationsResponse = await fetch('/api/student/reservations')
        if (reservationsResponse.ok) {
          const reservationsData = await reservationsResponse.json()
          const upcomingCount = reservationsData.reservations.filter((r: any) =>
            r.status === 'CONFIRMED' && new Date(r.class.startsAt) > new Date()
          ).length
          setDashboardData(prev => ({
            ...prev,
            upcomingReservationsCount: upcomingCount
          }))
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mi Panel</h1>
        <a
          href="/student/classes"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reservar Clase
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Paquetes Activos</h2>
              <p className="text-3xl font-bold text-blue-600">
                {loading ? '...' : dashboardData.activePackagesCount}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Créditos Disponibles</h2>
              <p className="text-3xl font-bold text-green-600">
                {loading ? '...' : dashboardData.totalActiveCredits}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Próximas Clases</h2>
              <p className="text-3xl font-bold text-purple-600">
                {loading ? '...' : dashboardData.upcomingReservationsCount}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Próximas Clases</h2>
            <a
              href="/student/reservations"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Ver todas las reservas →
            </a>
          </div>
          <p className="text-gray-600">No hay clases próximas</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/student/classes"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Explorar Clases</h3>
              <p className="text-sm text-gray-600 mt-1">Encuentra y reserva clases disponibles</p>
            </a>
            <a
              href="/student/reservations"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Mis Reservas</h3>
              <p className="text-sm text-gray-600 mt-1">Ve tus clases reservadas</p>
            </a>
            <a
              href="/student/credits"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Mis Créditos</h3>
              <p className="text-sm text-gray-600 mt-1">Rastrea paquetes y uso de créditos</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}