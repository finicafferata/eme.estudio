import { Metadata } from 'next'
import { ShieldX } from 'lucide-react'

export const metadata: Metadata = {
  title: 'No Autorizado | EME Estudio',
  description: 'No tienes permisos para acceder a esta página',
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <ShieldX className="mx-auto h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso Denegado
        </h1>
        <p className="text-gray-600 mb-6">
          No tienes permisos para acceder a esta página. Por favor contacta a tu administrador si crees que esto es un error.
        </p>
        <div className="space-y-3">
          <a
            href="/dashboard"
            className="block w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
          >
            Ir al Panel
          </a>
          <a
            href="/login"
            className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Iniciar Sesión Nuevamente
          </a>
        </div>
      </div>
    </div>
  )
}