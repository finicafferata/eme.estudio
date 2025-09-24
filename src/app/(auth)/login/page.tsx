import { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | EME Estudio',
  description: 'Inicia sesión en tu cuenta de EME Estudio',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/eme-logo.png"
              alt="EME Studio Logo"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">EME Estudio</h1>
          <h2 className="text-2xl font-semibold text-gray-900">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión en tu cuenta para continuar
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8 border border-gray-200">
          <LoginForm />
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>
            Al iniciar sesión, aceptas nuestros{' '}
            <a href="/terms" className="text-primary hover:text-primary/80">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="/privacy" className="text-primary hover:text-primary/80">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}