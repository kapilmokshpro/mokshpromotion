import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const pretty = (value: string) => value.replace(/_/g, " ").toLowerCase()

async function updateWorkTask(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const taskId = Number(params.id)
    const body = await req.json()
    const { status, title, description, priority, dueDate, assignedToId } = body

    const task = await db.workTask.findUnique({ where: { id: taskId } })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")
    const isAssignedUser = task.assignedToId === Number(session.user.id)
    if (!isAdmin && !isAssignedUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const data: Record<string, unknown> = {}
    const notes: string[] = []

    if (status && status !== task.status) {
      data.status = status
      notes.push(`Status changed to ${pretty(status)}.`)
    }

    if (isAdmin) {
      if (title !== undefined) data.title = title
      if (description !== undefined) data.description = description
      if (priority) data.priority = priority
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
      if (assignedToId && Number(assignedToId) !== task.assignedToId) {
        const nextAssignee = await db.user.findUnique({ where: { id: Number(assignedToId) }, select: { name: true, email: true, employeeId: true } })
        data.assignedToId = Number(assignedToId)
        notes.push(`Reassigned to ${nextAssignee?.name || nextAssignee?.employeeId || nextAssignee?.email || "another team member"}.`)
      }
    }

    const updatedTask = await db.workTask.update({ where: { id: taskId }, data })

    if (notes.length > 0) {
      await db.workTaskUpdate.createMany({
        data: notes.map((message) => ({ taskId, authorId: Number(session.user.id), message })),
      })
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Update WorkTask Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  return updateWorkTask(req, context)
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  return updateWorkTask(req, context)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await db.workTask.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE WorkTask Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
