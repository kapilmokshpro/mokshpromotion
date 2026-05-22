import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("Inspecting Punjab records with import details...")
    const items = await db.inventoryHoarding.findMany({
        where: {
            state: "Punjab"
        },
        select: {
            id: true,
            state: true,
            district: true,
            createdAt: true,
            importBatchId: true,
            outletName: true
        }
    })
    console.log(`Found ${items.length} records.`)
    console.log(JSON.stringify(items, null, 2))
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
