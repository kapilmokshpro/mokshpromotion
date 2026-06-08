"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Clock, AlertCircle, CheckCircle2, Calendar, ClipboardList, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
}

interface Task {
  id: string
  title: string
  description: string
  priority: string
  status: string
  dueDate: string
  assignedTo: {
    name: string | null
    email: string | null
    employeeId?: string | null
    role?: string
    department?: string | null
  }
}

interface WorkBoardClientProps {
  currentUser: {
    id: string
    role: string
    name?: string | null
    email?: string | null
  }
  initialTasks: Task[]
  users: User[]
}

const COLUMNS = [
  { id: "PENDING", title: "Pending", icon: Clock, color: "text-amber-500", dotColor: "bg-amber-500" },
  { id: "IN_PROGRESS", title: "In Progress", icon: AlertCircle, color: "text-indigo-500", dotColor: "bg-indigo-500" },
  { id: "COMPLETED", title: "Completed", icon: CheckCircle2, color: "text-emerald-500", dotColor: "bg-emerald-500" },
]

const PRIORITY_DOTS: Record<string, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-rose-500",
}

export function WorkBoardClient({ currentUser, initialTasks, users }: WorkBoardClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(currentUser.role)

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
    }
    try {
      const res = await fetch(`/api/work-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      router.refresh()
    } catch (error) {
      console.error(error)
      setTasks(initialTasks)
    }
  }

  const getInitials = (task: Task) => {
    return (task.assignedTo?.employeeId?.[0] || task.assignedTo?.name?.[0] || task.assignedTo?.email?.[0] || "U").toUpperCase()
  }

  const getAvatarBg = (task: Task) => {
    const code = task.assignedTo?.employeeId || task.assignedTo?.name || "U";
    const colors = [
      "bg-blue-500",
      "bg-indigo-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-rose-500",
    ];
    let sum = 0;
    for (let i = 0; i < code.length; i++) sum += code.charCodeAt(i);
    return colors[sum % colors.length];
  }
  
  const pendingCount = tasks.filter(t => t.status === "PENDING").length
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length
  const completedCount = tasks.filter(t => t.status === "COMPLETED").length

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 bg-slate-50/50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight">Tasks</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage and monitor tasks across your team.</p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/assign-work/new"
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Link>
        )}
      </div>

      {/* Grid Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id)
          return (
            <div key={column.id} className="flex flex-col bg-[#f1f5f9]/60 rounded-2xl p-4 min-h-[300px]">
              {/* Column Title */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", column.dotColor)} />
                  <h3 className="font-bold text-slate-800 text-sm tracking-tight">{column.title}</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Tasks */}
              <div className="flex-1 space-y-3">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
                  >
                    {/* Top Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOTS[task.priority] || "bg-amber-500")} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.priority} Priority</span>
                    </div>

                    {/* Task Title */}
                    <h4 className="font-semibold text-slate-900 text-sm tracking-tight leading-snug mb-3">
                      {task.title}
                    </h4>

                    {/* Bottom Details */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(task.dueDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] text-white shrink-0 uppercase", getAvatarBg(task))}>
                          {getInitials(task)}
                        </div>
                        <span className="font-semibold text-slate-500">
                          {task.assignedTo?.employeeId || "User"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400 font-semibold">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm transition-all duration-200">
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", 
                  selectedTask.priority === "HIGH" && "bg-rose-50 text-rose-600 border-rose-200/50",
                  selectedTask.priority === "MEDIUM" && "bg-amber-50 text-amber-600 border-amber-200/50",
                  selectedTask.priority === "LOW" && "bg-emerald-50 text-emerald-600 border-emerald-200/50"
                )}>
                  {selectedTask.priority} Priority
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2.5 leading-snug">{selectedTask.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh]">
              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</h4>
                  <span className="text-xs font-bold text-slate-800">
                    {new Date(selectedTask.dueDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned To</h4>
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {selectedTask.assignedTo?.name || "Unknown"} ({selectedTask.assignedTo?.employeeId || "User"})
                  </span>
                </div>
              </div>

              {/* Status Updater Button Group */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Update Status</h4>
                <div className="grid grid-cols-3 gap-2">
                  {COLUMNS.map((col) => {
                    const isSelected = selectedTask.status === col.id
                    return (
                      <button
                        key={col.id}
                        onClick={() => updateTaskStatus(selectedTask.id, col.id)}
                        className={cn(
                          "py-2 px-1 text-[11px] font-bold rounded-lg border text-center transition-all",
                          isSelected 
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                        )}
                      >
                        {col.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
