import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { unstable_cache } from 'next/cache'

// Cache the states query for 5 minutes
const getCachedStates = unstable_cache(
    async () => {
        try {
            const states = await (db.inventoryHoarding.findMany as any)({
                where: {
                    availabilityStatus: 'AVAILABLE',
                    isActive: true
                },
                select: {
                    state: true
                },
                distinct: ['state']
            })

            return states
                .map((s: any) => s.state)
                .filter(Boolean)
                .sort()
        } catch (error) {
            console.error("INVENTORY_STATES_CACHE_QUERY", error)
            return []
        }
    },
    ['inventory-states'],
    {
        revalidate: 300, // 5 minutes
        tags: ['inventory-states']
    }
)

/**
 * GET /api/inventory/states
 * Returns list of unique states that have inventory
 * Cached for 5 minutes for better performance
 */
export async function GET() {
    try {
        const stateList = await getCachedStates()

        return NextResponse.json(stateList, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        })
    } catch (error) {
        console.error('Error fetching states:', error)
        return new NextResponse("Failed to fetch states", { status: 500 })
    }
}
