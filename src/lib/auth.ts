import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      status: UserStatus
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    status: UserStatus
  }
}

// declare module 'next-auth/jwt' {
//   interface JWT {
//     id: string
//     role: UserRole
//     status: UserStatus
//   }
// }

export const authOptions = {
  trustHost: true,
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials')
        }

        if (user.status !== UserStatus.ACTIVE) {
          throw new Error('Account is not active')
        }

        const isPasswordValid = await compare(password, user.passwordHash)

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          status: user.status,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }: any) {
      // Handle logout redirects
      if (url.startsWith(baseUrl)) {
        // If redirecting to a path within our app (like /login), allow it
        return url
      }

      // For login redirects, always go to /dashboard so middleware can handle role-based routing
      return `${baseUrl}/dashboard`
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.status = (user as any).status
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).status = token.status
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const nextAuth = NextAuth(authOptions)

export const handlers = {
  GET: nextAuth.handlers.GET,
  POST: nextAuth.handlers.POST,
}

export const auth = nextAuth.auth
export const signIn = nextAuth.signIn
export const signOut = nextAuth.signOut

export default nextAuth