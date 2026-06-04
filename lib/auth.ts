import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
          phone: user.phone ?? undefined,
          businessName: user.businessName ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as any).role
        token.phone = (user as any).phone
        token.businessName = (user as any).businessName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string
        session.user.role = token.role as string
        session.user.phone = token.phone as string
        session.user.businessName = token.businessName as string
      }
      return session
    },
  },
  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    id: string
    role: string
    phone?: string
    businessName?: string
  }
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      phone?: string
      businessName?: string
    }
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    phone?: string
    businessName?: string
  }
}
