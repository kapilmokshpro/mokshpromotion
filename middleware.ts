import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname
        const role = token?.role as string | undefined

        // Super Admin bypasses all middleware redirects as they have full access
        if (role === "SUPER_ADMIN") {
            return
        }

        // UNASSIGNED users can only see the generic dashboard
        if (role === "UNASSIGNED" && path !== "/dashboard") {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (role === "SITE_MEDIA" && path !== "/dashboard" && !path.startsWith("/dashboard/site-media")) {
            return NextResponse.redirect(new URL("/dashboard/site-media", req.url))
        }

        if (path.startsWith("/dashboard/admin") && !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/sales") && !["SALES", "GRAPHIC", "ADMIN", "SUPER_ADMIN", "FINANCE", "OPERATIONS"].includes(role || "")) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/finance") && !["FINANCE", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/operations") && !["OPERATIONS", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/vendor") && !["VENDOR"].includes(role || "")) {
            return NextResponse.redirect(new URL("/dashboard", req.url))
        }

        if (path.startsWith("/dashboard/site-media") && !["SITE_MEDIA", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
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
