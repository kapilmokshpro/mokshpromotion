"use client"

import type { ComponentType } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Globe, Home, Loader2, LogOut, MessageCircle, MessageSquareText, Send, Settings, Users2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import EditUserModal from "@/components/dashboard/EditUserModal"

type TeamUser = {
  id: number
  name: string | null
  email: string | null
  role: string
  employeeId?: string | null
  department?: string | null
}

type TaskUpdate = {
  id: number
  message: string
  createdAt: string
  author: TeamUser
}

type Task = {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  updatedAt: string
  assignedTo: TeamUser
  assignedBy: TeamUser
  updates: TaskUpdate[]
}

type Props = {
  currentUser: TeamUser
  isAdmin: boolean
  tasks: Task[]
  users: TeamUser[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
}

const STATUS_ORDER = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const

const formatDate = (value: string | null | undefined) => {
  if (!value) return "No date"
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

const formatTime = (value: string) => {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(value))
}

export default function CrmDashboardClient({ currentUser, isAdmin, tasks: initialTasks, users }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTaskId, setSelectedTaskId] = useState<number>(initialTasks[0]?.id || 0)
  const [statusValue, setStatusValue] = useState(initialTasks[0]?.status || "PENDING")
  const [assigneeValue, setAssigneeValue] = useState<number>(initialTasks[0]?.assignedTo?.id || currentUser.id)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || tasks[0] || null

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId)
    setIsTaskModalOpen(true)
  }

  useEffect(() => {
    if (!selectedTask && tasks[0]) {
      setSelectedTaskId(tasks[0].id)
    }
  }, [tasks, selectedTask])

  useEffect(() => {
    if (!selectedTask) return
    setStatusValue(selectedTask.status)
    setAssigneeValue(selectedTask.assignedTo?.id || currentUser.id)
    setNote("")
  }, [currentUser.id, selectedTask?.id])

  const counts = {
    assigned: tasks.filter((task) => task.status === "PENDING").length,
    progress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    done: tasks.filter((task) => task.status === "COMPLETED").length,
  }

  // Fetch chat unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chat/unread")
        if (res.ok) {
          const data = await res.json()
          setChatUnread(data.total || 0)
        }
      } catch { /* silent */ }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  const openDmWithUser = async (targetUserId: number) => {
    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      })
      if (res.ok) {
        const dm = await res.json()
        router.push(`/crm-dashboard/chat?channel=${dm.id}`)
      }
    } catch {
      router.push("/crm-dashboard/chat")
    }
  }

  const updateTask = async () => {
    if (!selectedTask) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = { status: statusValue }
      if (isAdmin) body.assignedToId = assigneeValue

      const res = await fetch(`/api/work-tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Failed to update task")

      setTasks((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                status: statusValue,
                assignedTo: isAdmin ? users.find((user) => user.id === assigneeValue) || task.assignedTo : task.assignedTo,
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      )
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const sendNote = async () => {
    if (!selectedTask || !note.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/work-tasks/${selectedTask.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: note.trim() }),
      })

      if (!res.ok) throw new Error("Failed to send update")

      const created = await res.json()
      setTasks((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                updates: [...task.updates, created],
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      )
      setNote("")
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 w-full max-w-full overflow-x-hidden">
      <section className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 lg:px-8 w-full max-w-full">
        {/* Top Header with User Profile & Logout */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
          <div className="min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#002147]">
              <Users2 className="h-4 w-4 shrink-0" />
              <span>CRM dashboard</span>
            </div>
            <h1 className="mt-1.5 text-xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 break-words">
              Work assigned to the team
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
              Simple task tracking with work messages, status changes, and updates.
            </p>
          </div>

          {/* User Actions Bar: 2-column grid on small mobile, flex row on sm+ */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
            {/* Back to Home Website Button */}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-[#002147] hover:text-white hover:border-[#002147] min-w-0"
              title="Go to main website home page"
            >
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 shrink-0" />
              <span className="truncate">Back to Website</span>
            </button>

            {/* Profile Settings Button Card */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="col-span-1 group flex items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 px-2 sm:p-2 sm:pr-3.5 text-left shadow-sm transition-all hover:border-blue-300 hover:bg-slate-50 min-w-0"
              title="Click to open Profile Settings"
            >
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-[#002147] text-xs sm:text-sm font-bold text-white shadow-sm shrink-0">
                  {(currentUser.name || currentUser.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate text-xs font-semibold text-slate-900 max-w-[75px] sm:max-w-[130px]">
                    {currentUser.name || currentUser.email || "User"}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-blue-800 truncate">
                    {currentUser.role}
                  </p>
                </div>
              </div>
              <Settings className="h-3.5 w-3.5 text-slate-400 shrink-0 hidden xs:block sm:block" />
            </button>

            {/* Team Chat Button */}
            <button
              type="button"
              onClick={() => router.push("/crm-dashboard/chat")}
              className="col-span-1 relative inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-[#002147] shadow-sm transition-all hover:bg-[#002147] hover:text-white min-w-0"
              title="Open Team Chat"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Chat</span>
              {chatUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-[18px] min-w-[18px] flex items-center justify-center px-1 shadow-sm">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white min-w-0"
              title="Log out of CRM"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Logout</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-2.5 sm:gap-4 sm:grid-cols-3 w-full min-w-0">
          <SummaryCard label="Assigned" value={counts.assigned} icon={Clock3} />
          <SummaryCard label="In progress" value={counts.progress} icon={Loader2} />
          <SummaryCard label="Completed" value={counts.done} icon={CheckCircle2} />
        </div>

        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Full-width Tasks Board */}
          <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-3 sm:px-5 w-full min-w-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">Tasks</h2>
                <p className="text-xs text-slate-500 truncate">Assigned, in progress, completed</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {tasks.length} total
              </span>
            </div>

            <div className="w-full min-w-0">
              <div className="grid grid-cols-1 gap-2.5 sm:gap-px bg-slate-100 sm:bg-slate-200 sm:grid-cols-3 w-full min-w-0 p-2 sm:p-0">
                {STATUS_ORDER.map((status) => {
                  const columnTasks = tasks.filter((task) => task.status === status)

                  return (
                    <div key={status} className="flex flex-col min-h-[240px] sm:min-h-[360px] bg-slate-50 p-2.5 sm:p-4 w-full min-w-0 rounded-xl sm:rounded-none border sm:border-none border-slate-200/80">
                      <div className="mb-2 flex items-center justify-between gap-2 min-w-0">
                        <h3 className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{STATUS_LABELS[status]}</h3>
                        <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 sm:space-y-3 min-w-0 flex-1 max-h-[400px] sm:max-h-[540px] overflow-y-auto pr-0.5 sm:pr-1">
                        {columnTasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => handleSelectTask(task.id)}
                            className={cn(
                              "w-full rounded-xl border p-2.5 sm:p-3.5 text-left transition-all min-w-0 overflow-hidden block",
                              selectedTask?.id === task.id
                                ? "border-[#002147] bg-blue-50/80 shadow-sm ring-1 ring-[#002147]/20"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                            )}
                          >
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <span className="inline-block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400 max-w-[100px] sm:max-w-[120px]">
                                {task.priority} priority
                              </span>
                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                {STATUS_LABELS[status]}
                              </span>
                            </div>

                            <h4 className="mt-1 sm:mt-1.5 text-xs sm:text-sm font-semibold text-slate-900 break-words line-clamp-2 min-w-0">
                              {task.title}
                            </h4>

                            <p className="mt-1 line-clamp-2 text-xs text-slate-600 break-words leading-relaxed">
                              {task.description || "No description."}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2 text-xs text-slate-500 min-w-0">
                              <span className="inline-flex items-center gap-1 shrink-0 text-[10px] sm:text-[11px]">
                                <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
                                <span>{formatDate(task.dueDate)}</span>
                              </span>
                              <span className="truncate text-[10px] sm:text-[11px] font-medium text-slate-600 min-w-0 max-w-[90px] sm:max-w-[110px] text-right">
                                {task.assignedTo.name || task.assignedTo.email || "Employee"}
                              </span>
                            </div>
                          </button>
                        ))}

                        {columnTasks.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3.5 text-center text-xs text-slate-400">
                            No tasks here.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Task Detail Workroom - Moved after Tasks section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4 min-w-0 w-full">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#002147]">Task detail</p>
                <h2 className="mt-0.5 text-base sm:text-xl font-semibold text-slate-900 truncate">Workroom</h2>
              </div>
              <MessageSquareText className="h-5 w-5 text-slate-400 shrink-0" />
            </div>

            {!selectedTask && <div className="mt-4 text-xs sm:text-sm text-slate-500">Select a task from the board above to view details and updates.</div>}

            {selectedTask && (
              <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 w-full min-w-0">
                {/* Left Column: Task Overview & Status Modification */}
                <div className="space-y-4 lg:col-span-6 w-full min-w-0">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5 w-full min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                      <span className="inline-flex items-center rounded-full bg-[#002147] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-white shrink-0">
                        {STATUS_LABELS[selectedTask.status]}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 shrink-0">
                        {selectedTask.priority} priority
                      </span>
                    </div>

                    <h3 className="mt-2.5 sm:mt-3 text-base sm:text-xl font-semibold text-slate-900 break-words min-w-0">{selectedTask.title}</h3>
                    <p className="mt-1.5 sm:mt-2 whitespace-pre-wrap text-xs sm:text-sm text-slate-600 break-words leading-relaxed">
                      {selectedTask.description || "No description provided."}
                    </p>

                    <div className="mt-3.5 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5 w-full min-w-0">
                      <InfoTile label="Due date" value={formatDate(selectedTask.dueDate)} />
                      <InfoTile label="Assigned by" value={selectedTask.assignedBy.name || selectedTask.assignedBy.email || "Team"} />
                      <InfoTile label="Assigned to" value={selectedTask.assignedTo.name || selectedTask.assignedTo.email || "Employee"} />
                      <InfoTile label="Updated" value={formatDate(selectedTask.updatedAt)} />
                    </div>

                    {/* Team Coordination Chat */}
                    <div className="mt-3.5 sm:mt-4 pt-3 border-t border-slate-200/80 w-full min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Team Coordination Chat</p>
                      <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0">
                        {selectedTask.assignedTo.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => openDmWithUser(selectedTask.assignedTo.id)}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#002147] text-white px-3 py-2 text-xs font-semibold hover:bg-[#003366] transition-all shadow-sm truncate min-w-0"
                          >
                            <MessageCircle className="h-3.5 w-3.5 shrink-0 text-blue-200" />
                            <span className="truncate">Chat with {selectedTask.assignedTo.name?.split(" ")[0] || "Assignee"}</span>
                          </button>
                        )}
                        {selectedTask.assignedBy.id !== currentUser.id && selectedTask.assignedBy.id !== selectedTask.assignedTo.id && (
                          <button
                            type="button"
                            onClick={() => openDmWithUser(selectedTask.assignedBy.id)}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 text-[#002147] px-3 py-2 text-xs font-semibold hover:bg-[#002147] hover:text-white transition-all shadow-sm truncate min-w-0"
                          >
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Chat with {selectedTask.assignedBy.name?.split(" ")[0] || "Assigner"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 sm:p-5 w-full min-w-0">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Change task</h4>
                    <div className="mt-2.5 sm:mt-3 space-y-3 w-full min-w-0">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                        <select
                          value={statusValue}
                          onChange={(e) => setStatusValue(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm min-w-0"
                        >
                          <option value="PENDING">Assigned</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>

                      {isAdmin && (
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Reassign</label>
                          <select
                            value={assigneeValue}
                            onChange={(e) => setAssigneeValue(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm truncate min-w-0"
                          >
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {(user.employeeId || user.name || user.email || "Employee") + (user.role ? ` - ${user.role}` : "")}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={updateTask}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002147] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 w-full sm:w-auto"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ArrowRight className="h-4 w-4 shrink-0" />}
                        Save changes
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Work Updates History & Input */}
                <div className="space-y-4 lg:col-span-6 w-full min-w-0">
                  <div className="rounded-xl border border-slate-200 p-3 sm:p-5 w-full min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Updates & Work Messages</h4>
                      <div className="mt-2.5 sm:mt-3 max-h-60 sm:max-h-80 space-y-2 overflow-y-auto min-w-0 pr-0.5 sm:pr-1">
                        {selectedTask.updates.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 p-3.5 text-center text-xs text-slate-500">
                            No updates yet.
                          </div>
                        )}
                        {selectedTask.updates.map((update) => (
                          <div key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 w-full min-w-0 overflow-hidden">
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {update.author.name || update.author.email || "Team member"}
                              </p>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 shrink-0">{formatTime(update.createdAt)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 break-words leading-relaxed">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2 w-full min-w-0">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Add a short update."
                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm min-w-0"
                      />
                      <button
                        type="button"
                        onClick={sendNote}
                        disabled={sending || !note.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#002147] px-4 py-2 text-xs sm:text-sm font-semibold text-[#002147] transition-colors hover:bg-[#002147] hover:text-white disabled:opacity-60 w-full sm:w-auto"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Send className="h-4 w-4 shrink-0" />}
                        Send update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <EditUserModal
          user={{
            id: currentUser.id,
            name: currentUser.name || "",
            email: currentUser.email || "",
            role: currentUser.role,
            department: currentUser.department || null,
            employeeId: currentUser.employeeId || null,
          }}
          isSelfEdit={true}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* Logout Confirmation Pop-up Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <LogOut className="h-6 w-6" />
            </div>

            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-slate-900">Confirm Logout</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Are you sure you want to log out of your CRM session?
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoggingOut(true)
                  await signOut({ callbackUrl: "/crm-dashboard/login" })
                }}
                disabled={loggingOut}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 shadow-sm"
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <span>Log out</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Task Detail Pop-up Modal (Mobile & Desktop) */}
      {isTaskModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 min-w-0 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 min-w-0 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#002147]">Task detail pop-up</p>
                <h2 className="mt-0.5 text-base sm:text-lg font-semibold text-slate-900 truncate">
                  {selectedTask.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
                title="Close pop-up"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5 min-w-0">
              {/* Task Overview Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                  <span className="inline-flex items-center rounded-full bg-[#002147] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shrink-0">
                    {STATUS_LABELS[selectedTask.status]}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shrink-0">
                    {selectedTask.priority} priority
                  </span>
                </div>

                <h3 className="mt-3 text-base sm:text-lg font-semibold text-slate-900 break-words">{selectedTask.title}</h3>
                <p className="mt-1.5 whitespace-pre-wrap text-xs sm:text-sm text-slate-600 break-words leading-relaxed">
                  {selectedTask.description || "No description provided."}
                </p>

                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:gap-2.5 min-w-0">
                  <InfoTile label="Due date" value={formatDate(selectedTask.dueDate)} />
                  <InfoTile label="Assigned by" value={selectedTask.assignedBy.name || selectedTask.assignedBy.email || "Team"} />
                  <InfoTile label="Assigned to" value={selectedTask.assignedTo.name || selectedTask.assignedTo.email || "Employee"} />
                  <InfoTile label="Updated" value={formatDate(selectedTask.updatedAt)} />
                </div>

                {/* Team Coordination Chat */}
                <div className="mt-3.5 pt-3 border-t border-slate-200/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Team Coordination Chat</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {selectedTask.assignedTo.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => openDmWithUser(selectedTask.assignedTo.id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#002147] text-white px-3.5 py-2 text-xs font-semibold hover:bg-[#003366] transition-all shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-blue-200" />
                        <span>Chat 1-on-1 with {selectedTask.assignedTo.name?.split(" ")[0] || "Assignee"}</span>
                      </button>
                    )}
                    {selectedTask.assignedBy.id !== currentUser.id && selectedTask.assignedBy.id !== selectedTask.assignedTo.id && (
                      <button
                        type="button"
                        onClick={() => openDmWithUser(selectedTask.assignedBy.id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 text-[#002147] px-3.5 py-2 text-xs font-semibold hover:bg-[#002147] hover:text-white transition-all shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Chat 1-on-1 with {selectedTask.assignedBy.name?.split(" ")[0] || "Assigner"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Task Status & Reassign Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 min-w-0">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Change task</h4>
                <div className="mt-3 space-y-3 min-w-0">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                    <select
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm min-w-0"
                    >
                      <option value="PENDING">Assigned</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Reassign</label>
                      <select
                        value={assigneeValue}
                        onChange={(e) => setAssigneeValue(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm truncate min-w-0"
                      >
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {(user.employeeId || user.name || user.email || "Employee") + (user.role ? ` - ${user.role}` : "")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      await updateTask()
                    }}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002147] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 w-full sm:w-auto"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ArrowRight className="h-4 w-4 shrink-0" />}
                    Save changes
                  </button>
                </div>
              </div>

              {/* Updates & Notes Box */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 min-w-0">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Updates & Work Messages</h4>
                <div className="mt-3 space-y-2 min-w-0">
                  {selectedTask.updates.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
                      No updates yet.
                    </div>
                  )}
                  {selectedTask.updates.map((update) => (
                    <div key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {update.author.name || update.author.email || "Team member"}
                        </p>
                        <span className="text-[9px] text-slate-400 shrink-0">{formatTime(update.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 break-words leading-relaxed">{update.message}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2 min-w-0">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Add a short update."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm min-w-0"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await sendNote()
                    }}
                    disabled={sending || !note.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#002147] px-4 py-2 text-xs sm:text-sm font-semibold text-[#002147] transition-colors hover:bg-[#002147] hover:text-white disabled:opacity-60 w-full sm:w-auto"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Send className="h-4 w-4 shrink-0" />}
                    Send update
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close Pop-up
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm w-full min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{label}</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 sm:p-2.5 text-slate-700 shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 w-full min-w-0 overflow-hidden">
      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-slate-400 truncate">{label}</p>
      <p className="mt-0.5 truncate text-xs sm:text-sm font-medium text-slate-900" title={value}>
        {value}
      </p>
    </div>
  )
}
