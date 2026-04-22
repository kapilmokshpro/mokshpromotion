"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
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

function ClientLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl")
    const callbackPath = normalizeCallbackPath(callbackUrl, "/")
    const registered = searchParams.get("registered") === "true"
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
            } else {
                const targetPath = normalizeCallbackPath(res?.url || callbackPath, "/")
                router.replace(targetPath)
                router.refresh()
            }
        } catch (err) {
            console.error(err)
            setError("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left: Branding Side */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#002147] relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="relative z-10">
                    <Link href="/" className="inline-block bg-white/10 backdrop-blur-sm p-3 rounded-lg hover:bg-white/20 transition-colors">
                        <Image src="/images/logo.png" alt="Moksh Promotion" width={140} height={45} className="h-8 w-auto brightness-0 invert" />
                    </Link>
                </div>

                <div className="relative z-10 max-w-lg space-y-6">
                    <h2 className="text-4xl font-bold leading-tight">Elevate Your Brand Reach With Strategic OOH Media.</h2>
                    <p className="text-blue-200 text-lg font-light leading-relaxed">
                        Access your campaign dashboard, track performance, and manage your media assets all in one place.
                    </p>
                </div>

                <div className="relative z-10 flex gap-4 text-sm text-blue-300">
                    <span>© {new Date().getFullYear()} Moksh Promotion</span>
                    <span>•</span>
                    <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                    <span>•</span>
                    <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                </div>

                {/* Decorative Backgrounds */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* Right: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="mb-8">
                        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#002147] transition-colors mb-6 group">
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
                        <p className="text-gray-500 mt-2">Sign in to your client portal</p>
                    </div>

                    {registered && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
                            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Account created successfully!</p>
                                <p className="text-sm opacity-90">Please sign in with your credentials.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    {...form.register("email")}
                                    className="block w-full rounded-xl border border-gray-200 pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#002147] focus:ring-[#002147] sm:text-sm shadow-sm transition-all hover:border-gray-300"
                                    type="email"
                                    placeholder="name@company.com"
                                />
                            </div>
                            {form.formState.errors.email && (
                                <p className="text-red-500 text-xs ml-1">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-gray-700">Password</label>
                                <Link href="#" className="text-xs font-medium text-[#002147] hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    {...form.register("password")}
                                    className="block w-full rounded-xl border border-gray-200 pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#002147] focus:ring-[#002147] sm:text-sm shadow-sm transition-all hover:border-gray-300"
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
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#002147] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002147] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Dashboard"}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-gray-50 text-gray-500">New to Moksh Promotion?</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link href="/signup" className="text-[#002147] font-bold text-sm hover:underline">
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ClientLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ClientLoginForm />
        </Suspense>
    )
}
