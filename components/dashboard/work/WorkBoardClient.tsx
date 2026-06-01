"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Clock, AlertCircle, CheckCircle2, ChevronRight, Calendar, ClipboardList, X, User } from "lucide-react"
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
  { id: "PENDING", title: "Pending", icon: Clock, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", pillBg: "bg-white" },
  { id: "IN_PROGRESS", title: "In Progress", icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", pillBg: "bg-white" },
  { id: "COMPLETED", title: "Completed", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", border: "border-green-200", pillBg: "bg-white" },
]

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-green-50 text-green-600 font-bold border-transparent",
  MEDIUM: "bg-orange-50 text-orange-500 font-bold border-transparent",
  HIGH: "bg-red-50 text-red-500 font-bold border-transparent",
}

export function WorkBoardClient({ currentUser, initialTasks, users }: WorkBoardClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(currentUser.role)

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
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
  
  const pendingCount = tasks.filter(t => t.status === "PENDING").length
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length
  const completedCount = tasks.filter(t => t.status === "COMPLETED").length

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 bg-[#fafbfe] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assign Work</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track tasks across your team.</p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/assign-work/new"
            className="flex items-center gap-2 bg-[#4f46e5] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Assign New Task
          </Link>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id)
          return (
            <div key={column.id} className="flex flex-col bg-[#f8f9fc] rounded-2xl border border-gray-100 pb-2">
              <div className="px-5 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <column.icon className={cn("w-5 h-5", column.color)} />
                  <h3 className="font-bold text-gray-900 text-base">{column.title}</h3>
                </div>
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", column.border, column.color, column.pillBg)}>
                  {columnTasks.length}
                </span>
              </div>
              
              <div className="flex-1 px-4 pb-4 space-y-4">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={cn("text-[10px] uppercase px-2.5 py-1 rounded-md border", PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM)}>
                        {task.priority}
                      </span>
                      
                      {column.id === "COMPLETED" ? (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-green-200 text-green-500 bg-green-50">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          className="text-xs font-medium text-gray-500 bg-transparent border-none appearance-none cursor-pointer outline-none hover:text-gray-700 pr-4 relative"
                          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right', backgroundRepeat: 'no-repeat', backgroundSize: '12px' }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      )}
                    </div>

                    <h4 className="font-bold text-gray-900 mb-4 text-[15px] leading-snug pr-2">
                      {task.title}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(task.dueDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2" title={task.assignedTo?.employeeId || task.assignedTo?.name || task.assignedTo?.email || "Unknown"}>
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[10px] border border-blue-100 shadow-sm shrink-0">
                          {getInitials(task)}
                        </div>
                        <span className="font-semibold text-gray-700 text-xs truncate max-w-[100px]">
                          {task.assignedTo?.employeeId || task.assignedTo?.name?.split(' ')[0] || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <p className="text-sm text-gray-400 font-medium">No tasks</p>
                  </div>
                )}
              </div>


            </div>
          )
        })}
      </div>

      {/* Footer Stats Bar */}
      <div className="bg-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 w-full md:w-auto mb-6 md:mb-0 md:border-r border-gray-100 md:pr-12">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{pendingCount}</h3>
            <p className="text-sm text-gray-500 font-medium">Pending Tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto mb-6 md:mb-0 md:border-r border-gray-100 md:px-12">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{inProgressCount}</h3>
            <p className="text-sm text-gray-500 font-medium">In Progress</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto mb-6 md:mb-0 md:border-r border-gray-100 md:px-12">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{completedCount}</h3>
            <p className="text-sm text-gray-500 font-medium">Completed</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto md:pl-12">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{tasks.length}</h3>
            <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090d16]/30 backdrop-blur-md transition-all duration-300">
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-gray-100 overflow-hidden flex flex-col transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100/80 bg-gradient-to-r from-blue-50/20 via-indigo-50/10 to-transparent">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 leading-snug tracking-tight">{selectedTask.title}</h3>
                <div className="flex items-center gap-2.5 mt-3">
                  <span className={cn(
                    "text-[10px] font-extrabold px-3 py-1 rounded-full border tracking-wide uppercase shadow-sm",
                    selectedTask.priority === "HIGH" && "bg-red-50 text-red-600 border-red-200/40",
                    selectedTask.priority === "MEDIUM" && "bg-orange-50 text-orange-600 border-orange-200/40",
                    selectedTask.priority === "LOW" && "bg-green-50 text-green-600 border-green-200/40"
                  )}>
                    {selectedTask.priority}
                  </span>
                  <span className={cn(
                    "text-[10px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 uppercase tracking-wider shadow-sm",
                    selectedTask.status === "PENDING" && "bg-amber-50 text-amber-700 border-amber-200/40",
                    selectedTask.status === "IN_PROGRESS" && "bg-blue-50 text-blue-700 border-blue-200/40",
                    selectedTask.status === "COMPLETED" && "bg-green-50 text-green-700 border-green-200/40"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      selectedTask.status === "PENDING" && "bg-amber-500",
                      selectedTask.status === "IN_PROGRESS" && "bg-blue-500",
                      selectedTask.status === "COMPLETED" && "bg-green-500"
                    )} />
                    {selectedTask.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 -mt-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Description */}
              <div>
                <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                  Description
                </h4>
                <div className="text-[14px] text-gray-700 whitespace-pre-wrap leading-relaxed bg-[#f8fafd] p-5 rounded-2xl border border-blue-50/50 shadow-inner">
                  {selectedTask.description}
                </div>
              </div>

              {/* Grid: Due Date & Assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-gray-100/80">
                {/* Due Date */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Due Date
                  </h4>
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 bg-gray-50/70 p-4 rounded-2xl border border-gray-100/60 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100/50">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="block text-[13px] font-bold text-gray-900">
                        {new Date(selectedTask.dueDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-bold tracking-wider uppercase mt-0.5">
                        IST Timezone
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned User */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    Assigned To
                  </h4>
                  <div className="flex items-center gap-3.5 bg-gradient-to-br from-blue-50/20 via-indigo-50/10 to-transparent p-4 rounded-2xl border border-gray-100/60 shadow-sm">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm border-2 border-white shadow-md shrink-0">
                      {getInitials(selectedTask)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-extrabold text-gray-900 text-[14px] leading-tight mb-1.5 truncate">
                        {selectedTask.assignedTo?.name || "Unknown User"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedTask.assignedTo?.employeeId && (
                          <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
                            {selectedTask.assignedTo.employeeId}
                          </span>
                        )}
                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50 uppercase tracking-wider">
                          {selectedTask.assignedTo?.role?.replace('_', ' ') || "User"}
                        </span>
                        {selectedTask.assignedTo?.department && (
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                            {selectedTask.assignedTo.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm active:scale-95"
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
