"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
  employeeId?: string | null
  department?: string | null
}

interface NewTaskFormProps {
  users: User[]
}

export function NewTaskForm({ users }: NewTaskFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assignedToIds: [] as string[],
    dueDate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.assignedToIds.length === 0) {
      setError("Please select at least one user.")
      return
    }
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/work-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to create task")
      }

      router.push("/dashboard/assign-work")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          {error && (
            <div className="p-4 mb-6 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Left Column: Task Details */}
            <div className="lg:col-span-3 space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
                <p className="text-sm text-gray-500">Provide the core information about this work assignment.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002147] focus:border-[#002147] transition-all text-sm"
                  placeholder="e.g. Update marketing materials"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  required
                  rows={10}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002147] focus:border-[#002147] transition-all text-sm resize-none"
                  placeholder="Provide detailed instructions, links, or expectations..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002147] focus:border-[#002147] transition-all text-sm cursor-pointer shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002147] focus:border-[#002147] transition-all text-sm appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Assignees */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assign To</h3>
                  <p className="text-sm text-gray-500">Select one or more employees.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.assignedToIds.length === users.length) {
                      setFormData({ ...formData, assignedToIds: [] })
                    } else {
                      setFormData({ ...formData, assignedToIds: users.map(u => u.id) })
                    }
                  }}
                  className="text-xs font-medium text-[#002147] hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                >
                  {formData.assignedToIds.length === users.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="w-full h-[380px] px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto shadow-inner">
                <div className="space-y-1.5">
                  {users.map((user) => {
                    const isSelected = formData.assignedToIds.includes(user.id);
                    return (
                      <label 
                        key={user.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                          isSelected ? 'bg-white border-blue-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setFormData((prev) => ({
                              ...prev,
                              assignedToIds: checked
                                ? [...prev.assignedToIds, user.id]
                                : prev.assignedToIds.filter((id) => id !== user.id),
                            }))
                          }}
                          className="w-5 h-5 text-[#002147] border-gray-300 rounded focus:ring-[#002147] cursor-pointer transition-colors"
                        />
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-[#002147]' : 'text-gray-700'}`}>
                            {user.employeeId || user.name || user.email}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {user.role}{user.department ? ` • ${user.department}` : ''}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-8 mt-8 flex justify-end gap-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => router.push("/dashboard/assign-work")}
              className="px-6 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 text-sm font-bold text-white bg-[#002147] rounded-xl hover:bg-blue-900 focus:ring-4 focus:ring-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
