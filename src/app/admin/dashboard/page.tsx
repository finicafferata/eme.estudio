'use client'

import { useEffect, useState } from 'react'
import { Users, Package, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SimpleAdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Cargando Dashboard...</h1>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Panel de Administración</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">Total Estudiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">
                {stats?.overview?.totalStudents || 0}
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">
              {stats?.overview?.studentsTrend > 0 ? '+' : ''}{stats?.overview?.studentsTrend?.toFixed(1) || 0}% este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">Paquetes Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">
                {stats?.overview?.activePackages || 0}
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">
              {stats?.overview?.packagesTrend > 0 ? '+' : ''}{stats?.overview?.packagesTrend?.toFixed(1) || 0}% este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">Clases Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">
                {stats?.overview?.thisWeekClasses || 0}
              </div>
              <Calendar className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {stats?.overview?.classesTrend?.toFixed(1) || 0}% vs semana pasada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">Ingresos del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">
                ${stats?.overview?.monthlyRevenue?.totalPesos || 0}
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              USD ${stats?.overview?.monthlyRevenue?.usd || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance for Today and Tomorrow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Classes */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Clases de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.attendance?.today?.length > 0 ? (
              <div className="space-y-4">
                {stats.attendance.today.map((classItem: any) => (
                  <div key={classItem.id} className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-blue-900">{classItem.title}</h3>
                        <div className="flex items-center text-sm text-blue-700 mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {classItem.time} - {classItem.instructor}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-800">
                          {classItem.attendeeCount}/{classItem.capacity} inscritos
                        </div>
                        <div className="text-xs text-blue-600">
                          {classItem.spotsAvailable} espacios disponibles
                        </div>
                      </div>
                    </div>
                    {classItem.attendees.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Estudiantes inscritos:</h4>
                        <div className="grid grid-cols-1 gap-1">
                          {classItem.attendees.map((attendee: any) => (
                            <div key={attendee.id} className="flex items-center text-sm text-blue-700">
                              <User className="w-3 h-3 mr-2" />
                              {attendee.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No hay clases programadas para hoy</p>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Classes */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-green-600" />
              Clases de Mañana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.attendance?.tomorrow?.length > 0 ? (
              <div className="space-y-4">
                {stats.attendance.tomorrow.map((classItem: any) => (
                  <div key={classItem.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-green-900">{classItem.title}</h3>
                        <div className="flex items-center text-sm text-green-700 mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {classItem.time} - {classItem.instructor}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-800">
                          {classItem.attendeeCount}/{classItem.capacity} inscritos
                        </div>
                        <div className="text-xs text-green-600">
                          {classItem.spotsAvailable} espacios disponibles
                        </div>
                      </div>
                    </div>
                    {classItem.attendees.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-800 mb-2">Estudiantes inscritos:</h4>
                        <div className="grid grid-cols-1 gap-1">
                          {classItem.attendees.map((attendee: any) => (
                            <div key={attendee.id} className="flex items-center text-sm text-green-700">
                              <User className="w-3 h-3 mr-2" />
                              {attendee.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No hay clases programadas para mañana</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Resumen Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Total de estudiantes registrados</span>
              <span className="font-bold text-purple-600">{stats?.overview?.totalStudents || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Paquetes activos en el sistema</span>
              <span className="font-bold text-blue-600">{stats?.overview?.activePackages || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
              <span className="text-gray-700">Clases programadas esta semana</span>
              <span className="font-bold text-emerald-600">{stats?.overview?.thisWeekClasses || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
              <span className="text-gray-700">Ingresos totales del mes (ARS)</span>
              <span className="font-bold text-yellow-600">${stats?.overview?.monthlyRevenue?.totalPesos || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}