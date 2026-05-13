"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail, Lock, ShieldCheck } from "lucide-react"

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
})

const normalizeCallbackPath = (value: string | null, fallbackPath: string) => {
    if (!value) return fallbackPath

    if (value.startsWith("/") && !value.startsWith("//")) {
        return value
    }

    try {
        const parsed = new URL(value)
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
        return path.startsWith("/") ? path : fallbackPath
    } catch {
        return fallbackPath
    }
}

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl")
    const callbackPath = normalizeCallbackPath(callbackUrl, "/dashboard")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        setLoading(true)
        setError("")

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email: values.email,
                password: values.password,
                callbackUrl: callbackPath,
            })

            if (res?.error) {
                setError("Invalid email or password")
                return
            }

            // Wait a bit for the session to be established
            await new Promise(resolve => setTimeout(resolve, 500))

            // Get the fresh session to determine redirect
            const { getSession } = await import("next-auth/react")
            const session = await getSession()

            if (!session?.user?.role) {
                setError("Session initialization failed. Please try again.")
                return
            }

            // Redirect to role-specific dashboard
            let targetUrl = normalizeCallbackPath(res?.url || callbackPath, "/dashboard")
            if (targetUrl === "/dashboard") {
                switch (session.user.role) {
                    case "SUPER_ADMIN":
                        targetUrl = "/dashboard/super-admin"
                        break
                    case "ADMIN":
                        targetUrl = "/dashboard/admin"
                        break
                    case "SALES":
                        targetUrl = "/dashboard/sales"
                        break
                    case "FINANCE":
                        targetUrl = "/dashboard/finance"
                        break
                    case "OPERATIONS":
                        targetUrl = "/dashboard/operations"
                        break
                    case "VENDOR":
                        targetUrl = "/dashboard/vendor"
                        break
                    case "SITE_MEDIA":
                        targetUrl = "/dashboard/site-media"
                        break
                    default:
                        targetUrl = "/dashboard/sales"
                }
            }

            router.replace(targetUrl)
            router.refresh()
        } catch (err) {
            console.error(err)
            setError("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 relative">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-center [mask-size:20px_20px] pointer-events-none"></div>

            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100 z-10">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <ShieldCheck className="w-8 h-8 text-[#002147]" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-2">Admin Portal</h1>
                <p className="text-center text-gray-500 mb-8 text-sm">Secure access for authorized personnel only</p>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        {error}
                    </div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                            <input
                                {...form.register("email")}
                                className="block w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#002147] focus:ring-[#002147] sm:text-sm shadow-sm transition-all"
                                type="email"
                                placeholder="admin@example.com"
                            />
                        </div>
                        {form.formState.errors.email && (
                            <p className="text-red-500 text-xs ml-1">{form.formState.errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                            <input
                                {...form.register("password")}
                                className="block w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#002147] focus:ring-[#002147] sm:text-sm shadow-sm transition-all"
                                type="password"
                                placeholder="••••••••"
                            />
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-red-500 text-xs ml-1">{form.formState.errors.password.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-[#002147] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002147] disabled:opacity-50 transition-all mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
                    <p>Protected by enterprise-grade security.</p>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    )
}
