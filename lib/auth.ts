import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await db.user.findUnique({
                    where: {
                        email: credentials.email.trim().toLowerCase()
                    }
                })

                if (!user) {
                    return null
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department || undefined,
                    employeeId: user.employeeId || undefined,
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.department = (user as any).department
                token.employeeId = (user as any).employeeId
            }

            if (trigger === "update" && (session?.name || session?.email)) {
                if (session.name) token.name = session.name
                if (session.email) token.email = session.email
            }

            // Handle Impersonation
            if (trigger === "update" && session?.impersonateUserId) {
                // Security: Only SUPER_ADMIN can start impersonating
                // But wait, if we are ALREADY impersonating, we might want to switch users?
                // For now, let's assume we start from SUPER_ADMIN.
                // If we are already impersonating, token.role might be SALES.
                // So we should check if we are SUPER_ADMIN OR we have a valid originalUserId (admin)

                // We use DB to verify the original user is actually super admin if we are relying on originalUserId
                const adminId = token.originalUserId || token.id

                // Verify admin privs
                const requestingUser = await db.user.findUnique({ where: { id: parseInt(adminId) } })
                if (requestingUser?.role === 'SUPER_ADMIN') {
                    const targetUser = await db.user.findUnique({
                        where: { id: parseInt(session.impersonateUserId) }
                    })

                    if (targetUser) {
                        token.originalUserId = adminId // Keep track of the real admin
                        token.id = targetUser.id.toString()
                        token.name = targetUser.name
                        token.email = targetUser.email
                        token.role = targetUser.role
                    }
                }
            }

            // Handle Stop Impersonation
            if (trigger === "update" && session?.stopImpersonating && token.originalUserId) {
                const originalUser = await db.user.findUnique({
                    where: { id: parseInt(token.originalUserId) }
                })

                if (originalUser) {
                    token.id = originalUser.id.toString()
                    token.name = originalUser.name
                    token.email = originalUser.email
                    token.role = originalUser.role
                    delete token.originalUserId
                }
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id
                session.user.role = token.role
                session.user.originalUserId = token.originalUserId
                session.user.department = token.department as string | undefined
                session.user.employeeId = token.employeeId as string | undefined
            }
            return session
        }
    }
}
