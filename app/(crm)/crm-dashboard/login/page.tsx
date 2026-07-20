"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft, Mail, Lock, ShieldAlert, BriefcaseBusiness, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

const loginSchema = z.object({
    email: z.string().email("Please enter a valid employee email"),
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

function CrmLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()!
    const callbackUrl = searchParams.get("callbackUrl")
    const callbackPath = normalizeCallbackPath(callbackUrl, "/crm-dashboard")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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
                setError("Invalid employee credentials. Please check your email and password.")
                return
            }

            await new Promise(resolve => setTimeout(resolve, 300))
            router.replace(normalizeCallbackPath(res?.url || callbackPath, "/crm-dashboard"))
            router.refresh()
        } catch (err) {
            console.error(err)
            setError("An unexpected error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen lg:h-screen lg:overflow-hidden flex bg-[#071224] text-white">
            {/* Left Column: Splash & Features */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-8 lg:p-12 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.15),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(135deg,_#071224,_#0c1e36_60%,_#050b14)] border-r border-white/10">
                {/* Grid Overlay */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                
                {/* Logo Container */}
                <div className="relative z-10">
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-3 rounded-2xl bg-white p-2.5 hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
                    >
                        <Image 
                            src="/images/logo.png" 
                            alt="Moksh Promotion" 
                            width={130} 
                            height={42} 
                            className="h-7 w-auto object-contain" 
                            priority 
                        />
                    </Link>
                </div>

                {/* Main Content Area: holds text and cards closer together */}
                <div className="relative z-10 flex flex-col justify-center flex-grow py-6 max-w-xl gap-8">
                    {/* Center Content */}
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1 text-xs font-semibold tracking-wider text-amber-300">
                            <BriefcaseBusiness className="w-3.5 h-3.5 text-amber-400" />
                            EMPLOYEE PORTAL
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                                CRM access for sales, operations, finance, and admin teams.
                            </h2>
                            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                                Track leads, manage follow-ups, and open the employee workspace without touching the public client portal.
                            </p>
                        </div>
                    </div>

                    {/* Bottom Stats/Features cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:border-amber-400/20 hover:scale-[1.03] group">
                            <p className="text-amber-400 font-semibold tracking-wide transition-colors group-hover:text-amber-300 text-sm">Leads</p>
                            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">Pipeline view & tracking</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:border-amber-400/20 hover:scale-[1.03] group">
                            <p className="text-amber-400 font-semibold tracking-wide transition-colors group-hover:text-amber-300 text-sm">Tasks</p>
                            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">Daily client follow-up</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:border-amber-400/20 hover:scale-[1.03] group">
                            <p className="text-amber-400 font-semibold tracking-wide transition-colors group-hover:text-amber-300 text-sm">Team</p>
                            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">Role-based access controls</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-900">
                <div className="w-full max-w-md space-y-4">
                    <div className="flex justify-start">
                        <Link 
                            href="/" 
                            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-950 transition-all border border-slate-200/80 rounded-full px-4 py-1.5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 group"
                        >
                            <ArrowLeft className="w-3 h-3 mr-1.5 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>
                    </div>

                    <div className="w-full bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-3xl p-6 sm:p-8 space-y-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">CRM Login</h1>
                            <p className="text-slate-500 mt-1 text-xs sm:text-sm">Sign in to the employee workspace</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200/60 text-red-700 p-3 rounded-xl flex items-start gap-2.5 animate-fade-in shadow-[0_2px_8px_rgba(239,68,68,0.04)]">
                                <ShieldAlert className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-medium leading-relaxed">{error}</p>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 ml-1">Employee Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
                                    <input
                                        {...form.register("email")}
                                        className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-xs sm:text-sm shadow-sm transition-all hover:border-slate-300 outline-none"
                                        type="email"
                                        placeholder="employee@company.com"
                                    />
                                </div>
                                {form.formState.errors.email && (
                                    <p className="text-red-600 text-[11px] ml-1 mt-1 flex items-center gap-1">
                                        <span className="inline-block w-1 h-1 rounded-full bg-red-600"></span>
                                        {form.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
                                    <input
                                        {...form.register("password")}
                                        className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-xs sm:text-sm shadow-sm transition-all hover:border-slate-300 outline-none"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword
                                            ? <EyeOff className="w-4 h-4" />
                                            : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {form.formState.errors.password && (
                                    <p className="text-red-600 text-[11px] ml-1 mt-1 flex items-center gap-1">
                                        <span className="inline-block w-1 h-1 rounded-full bg-red-600"></span>
                                        {form.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-[#071224]/10 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#071224] to-[#0d1f3a] hover:from-[#0d1f3a] hover:to-[#122b52] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#071224] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter CRM"}
                            </button>
                        </form>

                        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 backdrop-blur-sm p-4 text-xs text-amber-800 flex items-start gap-2.5 shadow-[0_2px_12px_rgba(245,158,11,0.02)]">
                            <ShieldAlert className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-900">Internal Access Only</p>
                                <p className="text-amber-800/80 mt-0.5 text-[11px] leading-relaxed">
                                    Restricted to authorized employees. Clients access via the public portal login.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function CrmLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#071224] text-white">Loading...</div>}>
            <CrmLoginForm />
        </Suspense>
    )
}
