import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const taskId = Number(params.id)
    const task = await db.workTask.findUnique({ where: { id: taskId } })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")
    const isAssignedUser = task.assignedToId === Number(session.user.id)
    if (!isAdmin && !isAssignedUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const updates = await db.workTaskUpdate.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, email: true, role: true, employeeId: true, department: true } } },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(updates)
  } catch (error) {
    console.error("GET WorkTaskUpdates Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const taskId = Number(params.id)
    const task = await db.workTask.findUnique({ where: { id: taskId } })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")
    const isAssignedUser = task.assignedToId === Number(session.user.id)
    if (!isAdmin && !isAssignedUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const message = String(body.message || "").trim()
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

    const created = await db.workTaskUpdate.create({
      data: { taskId, authorId: Number(session.user.id), message },
      include: { author: { select: { id: true, name: true, email: true, role: true, employeeId: true, department: true } } },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("POST WorkTaskUpdates Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
