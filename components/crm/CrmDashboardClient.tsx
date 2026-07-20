"use client"

import type { ComponentType } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, MessageSquareText, Send, Users2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || tasks[0] || null

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

  const recentMessages = selectedTask?.updates.slice(-3).reverse() ?? []

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#002147]">
          <Users2 className="h-4 w-4" />
          CRM dashboard
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Work assigned to the team</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Simple task tracking with a side panel for work messages, status changes, and updates.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Assigned" value={counts.assigned} icon={Clock3} />
          <SummaryCard label="In progress" value={counts.progress} icon={Loader2} />
          <SummaryCard label="Completed" value={counts.done} icon={CheckCircle2} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_420px]">
          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#002147]">Work sidebar</p>
              <h2 className="mt-2 text-xl font-semibold">Messages and task info</h2>

              {selectedTask ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected task</p>
                    <p className="mt-2 font-semibold">{selectedTask.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{STATUS_LABELS[selectedTask.status]}</p>
                  </div>

                  <InfoTile label="Assigned to" value={selectedTask.assignedTo.name || selectedTask.assignedTo.email || "Employee"} />
                  <InfoTile label="Due date" value={formatDate(selectedTask.dueDate)} />

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">Work messages</p>
                      <MessageSquareText className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {recentMessages.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                          No messages yet.
                        </div>
                      ) : (
                        recentMessages.map((update) => (
                          <div key={update.id} className="rounded-xl bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-800">
                              {update.author.name || update.author.email || "Team member"}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">{update.message}</p>
                            <p className="mt-2 text-xs text-slate-400">{formatTime(update.createdAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Select a task to see messages and details.
                </div>
              )}
            </div>
          </aside>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Tasks</h2>
                <p className="text-sm text-slate-500">Assigned, in progress, completed</p>
              </div>
              <span className="text-sm text-slate-500">{tasks.length} total</span>
            </div>

            <div className="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-3">
              {STATUS_ORDER.map((status) => {
                const columnTasks = tasks.filter((task) => task.status === status)

                return (
                  <div key={status} className="min-h-[320px] bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">{STATUS_LABELS[status]}</h3>
                      <span className="text-xs text-slate-500">{columnTasks.length}</span>
                    </div>

                    <div className="space-y-3">
                      {columnTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setSelectedTaskId(task.id)}
                          className={cn(
                            "w-full rounded-xl border p-4 text-left transition-colors",
                            selectedTask?.id === task.id ? "border-[#002147] bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{task.priority} priority</p>
                              <h4 className="mt-1 font-semibold">{task.title}</h4>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{STATUS_LABELS[status]}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{task.description || "No description."}</p>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(task.dueDate)}
                            </span>
                            <span>{task.assignedTo.name || task.assignedTo.email || "Employee"}</span>
                          </div>
                        </button>
                      ))}

                      {columnTasks.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                          No tasks here.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#002147]">Task detail</p>
                  <h2 className="mt-1 text-xl font-semibold">Workroom</h2>
                </div>
                <MessageSquareText className="h-5 w-5 text-slate-400" />
              </div>

              {!selectedTask && <div className="mt-5 text-sm text-slate-500">Select a task.</div>}

              {selectedTask && (
                <div className="mt-5 space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-full bg-[#002147] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                          {STATUS_LABELS[selectedTask.status]}
                        </span>
                        <h3 className="mt-3 text-2xl font-semibold">{selectedTask.title}</h3>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {selectedTask.priority}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {selectedTask.description || "No description provided."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <InfoTile label="Due date" value={formatDate(selectedTask.dueDate)} />
                      <InfoTile label="Assigned by" value={selectedTask.assignedBy.name || selectedTask.assignedBy.email || "Team"} />
                      <InfoTile label="Assigned to" value={selectedTask.assignedTo.name || selectedTask.assignedTo.email || "Employee"} />
                      <InfoTile label="Updated" value={formatDate(selectedTask.updatedAt)} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-700">Change task</h4>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-slate-600">Status</label>
                        <select
                          value={statusValue}
                          onChange={(e) => setStatusValue(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                        >
                          <option value="PENDING">Assigned</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>

                      {isAdmin && (
                        <div>
                          <label className="mb-1 block text-sm text-slate-600">Reassign</label>
                          <select
                            value={assigneeValue}
                            onChange={(e) => setAssigneeValue(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
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
                        className="inline-flex items-center gap-2 rounded-xl bg-[#002147] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        Save changes
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-700">Updates</h4>
                    <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                      {selectedTask.updates.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                          No updates yet.
                        </div>
                      )}
                      {selectedTask.updates.map((update) => (
                        <div key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium">{update.author.name || update.author.email || "Team member"}</p>
                            <span className="text-[11px] text-slate-500">{formatTime(update.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{update.message}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 space-y-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Add a short update."
                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={sendNote}
                        disabled={sending || !note.trim()}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#002147] px-4 py-2.5 text-sm font-semibold text-[#002147] disabled:opacity-60"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send update
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
