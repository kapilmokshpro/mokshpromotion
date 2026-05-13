"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Building2,
    FileText,
    CreditCard,
    Settings,
    Truck,
    LogOut,
    PieChart,
    Menu,
    X,
    ChevronRight,
    Search,
    Bell,
    ClipboardList,
    Image
} from "lucide-react"

interface SidebarProps {
    role: string | undefined
    isOpen: boolean
    setIsOpen: (open: boolean) => void
}

export function Sidebar({ role = "SALES", isOpen, setIsOpen }: SidebarProps) {
    const pathname = usePathname()

    const routes = [
        {
            label: "Overview",
            href: "/dashboard",
            icon: LayoutDashboard,
            active: pathname === "/dashboard" ||
                pathname === "/dashboard/admin" ||
                pathname === "/dashboard/finance" ||
                pathname === "/dashboard/operations" ||
                pathname === "/dashboard/vendor" ||
                pathname === "/dashboard/site-media",
            roles: ["ADMIN", "SALES", "FINANCE", "OPERATIONS", "VENDOR", "SITE_MEDIA"]
        },
        {
            label: "Site Media",
            href: "/dashboard/site-media",
            icon: Image,
            active: pathname.includes("/dashboard/site-media"),
            roles: ["SITE_MEDIA", "ADMIN"]
        },
        {
            label: "Vendor Overview",
            href: "/dashboard/vendor",
            icon: Truck,
            active: pathname === "/dashboard/vendor",
            roles: ["VENDOR"]
        },
        {
            label: "My Sites",
            href: "/dashboard/vendor/sites",
            icon: Building2,
            active: pathname.includes("/dashboard/vendor/sites"),
            roles: ["VENDOR"]
        },
        {
            label: "Sales Stats",
            href: "/dashboard/sales",
            icon: PieChart,
            active: pathname === "/dashboard/sales",
            roles: ["ADMIN", "SUPER_ADMIN"]
        },
        {
            label: "Leads",
            href: "/dashboard/sales/leads",
            icon: Users,
            active: pathname.includes("/dashboard/sales/leads"),
            roles: ["ADMIN", "SALES"]
        },
        {
            label: "Projects",
            href: "/dashboard/sales/projects",
            icon: Building2,
            active: pathname.includes("/dashboard/sales/projects"),
            roles: ["ADMIN", "SALES"]
        },
        {
            label: "Campaign Plans",
            href: "/dashboard/sales/plans",
            icon: ClipboardList,
            active: pathname.includes("/dashboard/sales/plans"),
            roles: ["ADMIN", "SALES"]
        },
        {
            label: "Invoices",
            href: "/dashboard/finance/invoices",
            icon: FileText,
            active: pathname.includes("/dashboard/finance/invoices"),
            roles: ["ADMIN", "FINANCE"]
        },
        {
            label: "Payments",
            href: "/dashboard/finance/payments",
            icon: CreditCard,
            active: pathname.includes("/dashboard/finance/payments"),
            roles: ["ADMIN", "FINANCE"]
        },
        {
            label: "Operations",
            href: "/dashboard/operations",
            icon: Truck,
            active: pathname.includes("/dashboard/operations"),
            roles: ["ADMIN", "OPERATIONS"]
        },
        {
            label: "Inventory",
            href: "/dashboard/admin/inventory",
            icon: PieChart,
            active: pathname.includes("/dashboard/admin/inventory"),
            roles: ["ADMIN"]
        },
        {
            label: "Users",
            href: "/dashboard/admin/users",
            icon: Settings,
            active: pathname.includes("/dashboard/admin/users"),
            roles: ["ADMIN"]
        },
        {
            label: "Vendors",
            href: "/dashboard/admin/vendors",
            icon: Users,
            active: pathname.includes("/dashboard/admin/vendors"),
            roles: ["ADMIN"]
        },
        {
            label: "Vendor Assignments",
            href: "/dashboard/admin/vendor-assignments",
            icon: Building2,
            active: pathname.includes("/dashboard/admin/vendor-assignments"),
            roles: ["ADMIN"]
        },
        {
            label: "Vendor Proofs",
            href: "/dashboard/admin/vendor-proofs",
            icon: ClipboardList,
            active: pathname.includes("/dashboard/admin/vendor-proofs"),
            roles: ["ADMIN"]
        },
        {
            label: "Discount Requests",
            href: "/dashboard/super-admin/discount-dashboard",
            icon: CreditCard,
            active: pathname.includes("/dashboard/super-admin/discount-dashboard"),
            roles: ["SUPER_ADMIN"]
        },
        {
            label: "All Users",
            href: "/dashboard/super-admin/users",
            icon: Users,
            active: pathname.includes("/dashboard/super-admin/users"),
            roles: ["SUPER_ADMIN"]
        },
    ]

    const filteredRoutes = routes.filter((route) => {
        if (role === "SUPER_ADMIN") return true
        return route.roles.includes(role)
    })

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-100 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col shadow-xl lg:shadow-none",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-50">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#002147] flex items-center justify-center text-white font-bold text-lg">M</div>
                        <span className="font-bold text-lg text-gray-900 tracking-tight">Moksh CRM</span>
                    </Link>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Info Snippet */}
                <div className="p-4 mx-4 mt-4 mb-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {role?.charAt(0) || "U"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 truncate">Current User</p>
                        <p className="text-xs text-blue-600 font-medium">{role || "Guest"}</p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                    <p className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu</p>
                    {filteredRoutes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                route.active
                                    ? "bg-[#002147] text-white shadow-md shadow-blue-900/20" // Premium Active State
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <route.icon className={cn("w-5 h-5", route.active ? "text-blue-300" : "text-gray-400 group-hover:text-blue-600")} />
                                {route.label}
                            </div>
                            {route.active && <ChevronRight className="w-4 h-4 text-blue-300" />}
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-50">
                    <Link
                        href="/api/auth/signout"
                        className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Link>
                </div>
            </aside>
        </>
    )
}


interface TopbarProps {
    onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { data: session, update } = useSession()
    const router = useRouter()

    // Check if impersonating (using type assertion or rely on updated types)
    // @ts-ignore
    const isImpersonating = !!session?.user?.originalUserId

    const handleStopImpersonating = async () => {
        try {
            await update({ stopImpersonating: true })
            router.push("/dashboard")
            router.refresh()
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm backdrop-blur-sm bg-white/90">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden">
                    <Menu className="w-6 h-6" />
                </button>

                {/* Optional Global Search */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 w-64 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Type to search..."
                        className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder:text-gray-400"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isImpersonating && (
                    <button
                        onClick={handleStopImpersonating}
                        className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-red-700 transition-all animate-pulse"
                    >
                        STOP IMPERSONATING
                    </button>
                )}

                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                {/* Could put a user dropdown here if needed */}
            </div>
        </header>
    )
}
