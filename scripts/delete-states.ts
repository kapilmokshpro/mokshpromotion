import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("=== DB CLEANUP: UP, PUNJAB, & CHANDIGARH TRICITY ===")

    // 1. Identify all matching InventoryHoarding records to delete
    const targetHoardings = await db.inventoryHoarding.findMany({
        where: {
            OR: [
                { state: { contains: "Uttar Pradesh", mode: "insensitive" } },
                { state: { contains: "Punjab", mode: "insensitive" } },
                { state: { contains: "Chandigarh", mode: "insensitive" } },
                { district: { contains: "Chandigarh", mode: "insensitive" } },
                { city: { contains: "Chandigarh", mode: "insensitive" } },
                { locationName: { contains: "Chandigarh", mode: "insensitive" } },
                { state: { contains: "Tricity", mode: "insensitive" } },
                { district: { contains: "Tricity", mode: "insensitive" } },
                { city: { contains: "Tricity", mode: "insensitive" } },
                { locationName: { contains: "Tricity", mode: "insensitive" } }
            ]
        },
        select: {
            id: true,
            state: true,
            district: true,
            locationName: true
        }
    })

    const targetIds = targetHoardings.map(h => h.id)
    console.log(`\nIdentified ${targetIds.length} inventory records to delete.`)

    if (targetIds.length === 0) {
        console.log("No matching records found. Deletion aborted.")
        return
    }

    // 2. Count child records to delete
    const mediaCount = await db.inventorySiteMedia.count({
        where: { inventoryHoardingId: { in: targetIds } }
    })

    const campaignItemCount = await db.leadCampaignItem.count({
        where: { inventoryHoardingId: { in: targetIds } }
    })

    const assignmentCount = await db.vendorSiteAssignment.count({
        where: { inventoryHoardingId: { in: targetIds } }
    })

    const proofCount = await db.vendorSiteProof.count({
        where: { inventoryHoardingId: { in: targetIds } }
    })

    console.log("\nAssociated child records found:")
    console.log(`- InventorySiteMedia: ${mediaCount}`)
    console.log(`- LeadCampaignItem (Campaigns/Leads): ${campaignItemCount}`)
    console.log(`- VendorSiteAssignment: ${assignmentCount}`)
    console.log(`- VendorSiteProof: ${proofCount}`)

    // 3. Perform Deletion in transaction for consistency
    console.log("\nStarting deletion process...")

    await db.$transaction(async (tx) => {
        // A. Delete Site Media
        if (mediaCount > 0) {
            console.log(`Deleting ${mediaCount} InventorySiteMedia records...`)
            await tx.inventorySiteMedia.deleteMany({
                where: { inventoryHoardingId: { in: targetIds } }
            })
        }

        // B. Delete Vendor Proofs
        if (proofCount > 0) {
            console.log(`Deleting ${proofCount} VendorSiteProof records...`)
            await tx.vendorSiteProof.deleteMany({
                where: { inventoryHoardingId: { in: targetIds } }
            })
        }

        // C. Delete Vendor Assignments
        if (assignmentCount > 0) {
            console.log(`Deleting ${assignmentCount} VendorSiteAssignment records...`)
            await tx.vendorSiteAssignment.deleteMany({
                where: { inventoryHoardingId: { in: targetIds } }
            })
        }

        // D. Delete Lead Campaign Items
        if (campaignItemCount > 0) {
            console.log(`Deleting ${campaignItemCount} LeadCampaignItem records...`)
            await tx.leadCampaignItem.deleteMany({
                where: { inventoryHoardingId: { in: targetIds } }
            })
        }

        // E. Finally, delete the main InventoryHoarding records
        console.log(`Deleting ${targetIds.length} InventoryHoarding records...`)
        const deletedHoardings = await tx.inventoryHoarding.deleteMany({
            where: { id: { in: targetIds } }
        })
        console.log(`Successfully deleted ${deletedHoardings.count} InventoryHoarding records!`)
    })

    console.log("\nVerification:")
    const remainingCount = await db.inventoryHoarding.count()
    console.log(`Total inventory records remaining in database: ${remainingCount}`)
    console.log("=== DB CLEANUP COMPLETE ===")
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
