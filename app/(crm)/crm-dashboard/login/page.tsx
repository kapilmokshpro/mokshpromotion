"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft, Mail, Lock, BadgeCheck, BriefcaseBusiness } from "lucide-react"
import Image from "next/image"

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

function CrmLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()!
    const callbackUrl = searchParams.get("callbackUrl")
    const callbackPath = normalizeCallbackPath(callbackUrl, "/crm-dashboard")
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
                setError("Invalid employee email or password")
                return
            }

            await new Promise(resolve => setTimeout(resolve, 300))
            router.replace(normalizeCallbackPath(res?.url || callbackPath, "/crm-dashboard"))
            router.refresh()
        } catch (err) {
            console.error(err)
            setError("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-[#071224] text-white">
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_40%),linear-gradient(135deg,_#071224,_#0d1f3a_55%,_#09111f)] border-r border-white/10">
                <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm p-3 hover:bg-white/20 transition-colors">
                        <Image src="/images/logo.png" alt="Moksh Promotion" width={140} height={45} className="h-8 w-auto brightness-0 invert" />
                    </Link>
                </div>

                <div className="relative z-10 max-w-xl space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">
                        <BriefcaseBusiness className="w-4 h-4" />
                        Employee Portal
                    </div>
                    <h2 className="text-4xl font-semibold leading-tight tracking-tight">CRM access for sales, operations, finance, and admin teams.</h2>
                    <p className="text-slate-300 text-lg leading-relaxed max-w-xl">
                        Track leads, manage follow-ups, and open the employee workspace without touching the public client portal.
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-amber-200 font-semibold">Leads</p>
                        <p className="text-slate-300 mt-1">Pipeline view</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-amber-200 font-semibold">Tasks</p>
                        <p className="text-slate-300 mt-1">Daily follow-up</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-amber-200 font-semibold">Team</p>
                        <p className="text-slate-300 mt-1">Role-based access</p>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-[#f5f7fb] text-slate-900">
                <div className="w-full max-w-md space-y-8">
                    <div className="mb-8">
                        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#071224] transition-colors mb-6 group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-950 tracking-tight">CRM Login</h1>
                        <p className="text-slate-500 mt-2">Sign in to the employee workspace</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                            <BadgeCheck className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Employee Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    {...form.register("email")}
                                    className="block w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500 sm:text-sm shadow-sm transition-all hover:border-slate-300"
                                    type="email"
                                    placeholder="employee@company.com"
                                />
                            </div>
                            {form.formState.errors.email && (
                                <p className="text-red-500 text-xs ml-1">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    {...form.register("password")}
                                    className="block w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500 sm:text-sm shadow-sm transition-all hover:border-slate-300"
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
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-[#071224] hover:bg-[#0d1f3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#071224] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enter CRM"}
                        </button>
                    </form>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        This portal is for internal users only. Client access stays on the public login page.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function CrmLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <CrmLoginForm />
        </Suspense>
    )
}
