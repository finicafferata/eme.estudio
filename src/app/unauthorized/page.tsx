import { Metadata } from 'next'
import { ShieldX } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Unauthorized | EME Estudio',
  description: 'You do not have permission to access this page',
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <ShieldX className="mx-auto h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-6">
          You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="space-y-3">
          <a
            href="/dashboard"
            className="block w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </a>
          <a
            href="/login"
            className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Sign In Again
          </a>
        </div>
      </div>
    </div>
  )
}