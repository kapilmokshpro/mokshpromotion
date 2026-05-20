import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Count total inventory items
    const total = await prisma.inventoryHoarding.count()
    
    // Count items with "Unknown Outlet"
    const unknownCount = await prisma.inventoryHoarding.count({
        where: {
            OR: [
                { outletName: "Unknown Outlet" },
                { name: "Unknown Outlet" }
            ]
        }
    })

    console.log(`Total items: ${total}`)
    console.log(`Unknown Outlet items: ${unknownCount}`)

    // Let's look at the locationName of some of the "Unknown Outlet" items to see if there is a pattern
    const samples = await prisma.inventoryHoarding.findMany({
        where: {
            OR: [
                { outletName: "Unknown Outlet" },
                { name: "Unknown Outlet" }
            ]
        },
        take: 30
    })

    console.log('--- SAMPLES ---')
    samples.forEach(s => {
        console.log(`Code: ${s.inventoryCode} | State: ${s.state} | District: ${s.district} | LocationName: ${s.locationName.replace(/\n/g, ' ')}`)
    })
}

main().catch(console.error).finally(() => prisma.$disconnect())
