"use client"

import { useState } from "react"
import AddUserModal from "@/components/dashboard/AddUserModal"
import EditUserModal from "@/components/dashboard/EditUserModal"
import { formatDateInIndia } from "@/lib/utils"
import { useRouter } from "next/navigation"

type UserRow = {
    id: number
    name: string
    email: string
    role: string
    createdAt: string | Date
}

export default function UsersPage({
    users,
    currentUserId,
    currentUserRole,
}: {
    users: UserRow[]
    currentUserId: number
    currentUserRole: string
}) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserRow | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [actionError, setActionError] = useState("")

    const canManageSuperAdmin = currentUserRole === "SUPER_ADMIN"

    async function handleDelete(user: UserRow) {
        const isSelf = user.id === currentUserId
        if (isSelf) {
            setActionError("You cannot delete your own account.")
            return
        }

        const protectedSuperAdmin = user.role === "SUPER_ADMIN" && !canManageSuperAdmin
        if (protectedSuperAdmin) {
            setActionError("Only SUPER_ADMIN can delete SUPER_ADMIN accounts.")
            return
        }

        const confirmed = window.confirm(`Delete user "${user.name}"? This action cannot be undone.`)
        if (!confirmed) return

        setDeletingId(user.id)
        setActionError("")

        try {
            const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || "Failed to delete user")
            }

            router.refresh()
        } catch (err: any) {
            console.error(err)
            setActionError(err.message || "Failed to delete user")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                    + Add User
                </button>
            </div>

            {actionError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-md">
                    {actionError}
                </div>
            )}

            <div className="md:hidden space-y-3">
                {users.map((user) => (
                    <div key={user.id} className="bg-white shadow rounded-lg border border-gray-200 p-4 space-y-2">
                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500 break-all">{user.email}</div>
                        <div className="flex items-center justify-between">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                    user.role === 'SALES' ? 'bg-blue-100 text-blue-800' :
                                    user.role === 'VENDOR' ? 'bg-amber-100 text-amber-800' :
                                    'bg-gray-100 text-gray-800'}`}>
                                {user.role}
                            </span>
                            <span className="text-xs text-gray-500">{formatDateInIndia(user.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                            <button
                                onClick={() => {
                                    setActionError("")
                                    setEditingUser(user)
                                }}
                                disabled={user.role === "SUPER_ADMIN" && !canManageSuperAdmin}
                                className="font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(user)}
                                disabled={deletingId === user.id || user.id === currentUserId || (user.role === "SUPER_ADMIN" && !canManageSuperAdmin)}
                                className="font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                            >
                                {deletingId === user.id ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'SALES' ? 'bg-blue-100 text-blue-800' :
                                            user.role === 'VENDOR' ? 'bg-amber-100 text-amber-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDateInIndia(user.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setActionError("")
                                                setEditingUser(user)
                                            }}
                                            disabled={user.role === "SUPER_ADMIN" && !canManageSuperAdmin}
                                            className="font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user)}
                                            disabled={deletingId === user.id || user.id === currentUserId || (user.role === "SUPER_ADMIN" && !canManageSuperAdmin)}
                                            className="font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {deletingId === user.id ? "Deleting..." : "Delete"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {isModalOpen && <AddUserModal onClose={() => setIsModalOpen(false)} />}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                />
            )}
        </div>
    )
}
