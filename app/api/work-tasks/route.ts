import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWorkAssignedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

        const tasks = await db.workTask.findMany({
            where: isAdmin ? undefined : { assignedToId: parseInt(session.user.id) },
            include: {
                assignedTo: { select: { id: true, name: true, email: true, employeeId: true } },
                assignedBy: { select: { id: true, name: true, email: true, employeeId: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("GET WorkTasks Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, priority, assignedToIds, description, dueDate } = body;

        if (!title || !priority || !assignedToIds || !Array.isArray(assignedToIds) || assignedToIds.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const tasks = [];
        for (const assignedToId of assignedToIds) {
            const task = await db.workTask.create({
                data: {
                    title,
                    priority,
                    description,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    assignedToId: parseInt(assignedToId),
                    assignedById: parseInt(session.user.id),
                    status: "PENDING"
                }
            });
            tasks.push(task);

            const assignedUser = await db.user.findUnique({
                where: { id: parseInt(assignedToId) },
                select: { email: true }
            });

            if (assignedUser?.email) {
                await sendWorkAssignedEmail(assignedUser.email, title, session.user.name || "Admin");
            }
        }

        return NextResponse.json(tasks, { status: 201 });
    } catch (error) {
        console.error("POST WorkTasks Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
