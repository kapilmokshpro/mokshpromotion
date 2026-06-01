import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            department?: string
            employeeId?: string
            originalUserId?: string
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: string
        department?: string
        employeeId?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        department?: string
        employeeId?: string
        originalUserId?: string
    }
}
