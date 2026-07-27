import { db } from "@/lib/db"
import { customerSchema } from "@/lib/schemas"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const validatedData = customerSchema.parse(body)

        const customer = await db.customer.create({
            data: validatedData
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("CUSTOMERS_POST", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : null
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : null

        const queryOptions: any = {
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { projects: true }
                }
            }
        }

        if (page && limit && page > 0 && limit > 0) {
            queryOptions.skip = (page - 1) * limit
            queryOptions.take = limit
        }

        const customers = await db.customer.findMany(queryOptions)

        return NextResponse.json(customers)
    } catch (error) {
        console.error("CUSTOMERS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
