import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        if (path.startsWith("/dashboard/admin") && !["ADMIN", "SUPER_ADMIN"].includes(token?.role as string)) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/sales") && !["SALES", "ADMIN", "SUPER_ADMIN", "FINANCE", "OPERATIONS"].includes(token?.role as string)) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/finance") && !["FINANCE", "ADMIN", "SUPER_ADMIN"].includes(token?.role as string)) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/operations") && !["OPERATIONS", "ADMIN", "SUPER_ADMIN"].includes(token?.role as string)) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/vendor") && !["VENDOR"].includes(token?.role as string)) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = {
    matcher: ["/dashboard/:path*"],
}
