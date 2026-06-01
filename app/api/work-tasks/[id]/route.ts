import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function updateWorkTask(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const taskId = parseInt(params.id);
        const body = await req.json();
        const { status, title, description, priority, dueDate } = body;

        const task = await db.workTask.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
        const isAssignedUser = task.assignedToId === parseInt(session.user.id);

        if (!isAdmin && !isAssignedUser) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // If not admin, can only update status
        const updateData: any = {};
        if (status) updateData.status = status;
        
        if (isAdmin) {
            if (title) updateData.title = title;
            if (description !== undefined) updateData.description = description;
            if (priority) updateData.priority = priority;
            if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        }

        const updatedTask = await db.workTask.update({
            where: { id: taskId },
            data: updateData
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error("Update WorkTask Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
    return updateWorkTask(req, context);
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
    return updateWorkTask(req, context);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const taskId = parseInt(params.id);

        await db.workTask.delete({
            where: { id: taskId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE WorkTask Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
