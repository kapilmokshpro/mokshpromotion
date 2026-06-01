"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { userUpdateSchema } from "@/lib/schemas"
import { z } from "zod"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

type UserFormValues = z.infer<typeof userUpdateSchema>

type EditableUser = {
    id: number
    employeeId?: string | null
    name: string
    email: string
    role: string
    department?: string | null
}

export default function EditUserModal({
    user,
    isSelfEdit = false,
    onClose,
}: {
    user: EditableUser
    isSelfEdit?: boolean
    onClose: () => void
}) {
    const router = useRouter()
    const { update } = useSession()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userUpdateSchema) as any,
        defaultValues: {
            name: user.name || "",
            email: user.email || "",
            role: (user.role as UserFormValues["role"]) || "SALES",
            department: (user.department as UserFormValues["department"]) || undefined,
            password: "",
            currentPassword: "",
        }
    })

    async function onSubmit(data: UserFormValues) {
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || "Failed to update user")
            }

            if (isSelfEdit) {
                await update({
                    name: data.name,
                    email: data.email,
                })
            }

            router.refresh()
            onClose()
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Failed to update user")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-4 text-gray-900">Edit User</h2>

                {user.employeeId && (
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Employee ID:</span>
                        <span className="text-sm font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{user.employeeId}</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            {...form.register("name")}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Full Name"
                        />
                        {form.formState.errors.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...form.register("email")}
                            type="email"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="user@example.com"
                        />
                        {form.formState.errors.email && <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>}
                    </div>

                    {!isSelfEdit ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    {...form.register("role")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="SALES">Sales</option>
                                    <option value="FINANCE">Finance</option>
                                    <option value="OPERATIONS">Operations</option>
                                    <option value="GRAPHIC">Graphic</option>
                                    <option value="HR">HR</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="VENDOR">Vendor</option>
                                    <option value="SITE_MEDIA">Site Media</option>
                                    <option value="UNASSIGNED">Unassigned</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Department</label>
                                <select
                                    {...form.register("department")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">None</option>
                                    <option value="SALES">Sales</option>
                                    <option value="OPERATIONS">Operations</option>
                                    <option value="GRAPHIC">Graphic</option>
                                    <option value="ACCOUNT">Account</option>
                                    <option value="HR">HR</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <input type="hidden" {...form.register("role")} />
                            <input type="hidden" {...form.register("department")} />
                        </>
                    )}

                    {isSelfEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Current Password <span className="text-red-500">*</span></label>
                            <input
                                {...form.register("currentPassword")}
                                type="password"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter current password to authorize changes"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                        <input
                            {...form.register("password")}
                            type="password"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Leave blank to keep existing password"
                        />
                        {form.formState.errors.password && <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>}
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Updating..." : "Update User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
