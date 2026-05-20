import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find some inventory items with "Unknown Outlet"
    const items = await prisma.inventoryHoarding.findMany({
        where: {
            OR: [
                { outletName: "Unknown Outlet" },
                { name: "Unknown Outlet" }
            ]
        },
        take: 10
    })

    console.log('--- UNKNOWN OUTLET ITEMS ---')
    items.forEach(item => {
        console.log({
            id: item.id,
            inventoryCode: item.inventoryCode,
            outletName: item.outletName,
            name: item.name,
            locationName: item.locationName,
            location: item.location,
            rawImportData: item.rawImportData ? JSON.parse(item.rawImportData as string) : null
        })
    })
    console.log('----------------------------')
}

main().catch(console.error).finally(() => prisma.$disconnect())
