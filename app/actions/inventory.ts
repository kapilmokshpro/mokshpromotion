"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Check Auth Helper
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        throw new Error("Unauthorized")
    }
    return session
}

export async function updateInventoryItem(id: number, data: {
    discountedRate?: number | null
    netTotal?: number | null
    isActive?: boolean
    view360Url?: string | null
    imageUrl?: string | null
}) {
    await checkAdmin()

    try {
        await db.inventoryHoarding.update({
            where: { id },
            data
        })
        revalidatePath("/dashboard/admin/inventory")
        return { success: true }
    } catch (error) {
        console.error("Update Inventory Error:", error)
        return { success: false, error: "Failed to update item" }
    }
}

export async function toggleInventoryStatus(id: number, isActive: boolean) {
    return updateInventoryItem(id, { isActive })
}

export async function bulkUpdatePrices(csvText: string) {
    await checkAdmin()

    try {
        const rows = csvText.split('\n').filter(r => r.trim());
        let successCount = 0;
        const errors: string[] = [];

        for (const row of rows) {
            // Expected Format: inventoryCode,discountedRate
            const [code, priceStr] = row.split(',').map(s => s.trim());

            if (!code || !priceStr) continue;

            const price = parseFloat(priceStr);
            if (isNaN(price)) {
                errors.push(`Invalid price for ${code}: ${priceStr}`);
                continue;
            }

            // Find item
            const item = await db.inventoryHoarding.findFirst({
                where: { inventoryCode: code }
            });

            if (!item) {
                errors.push(`Inventory Code not found: ${code}`);
                continue;
            }

            // Update
            await db.inventoryHoarding.update({
                where: { id: item.id },
                data: { discountedRate: price }
                // TODO: Should we auto-calc Net Total? 
                // Usually Net Total = discountedRate * area + charges.
                // For now, request asked for "Bulk Price Update", usually implying the rate or final price.
                // If the user pastes '360000', likely 'netTotal' or 'discountedRate'?
                // The example: "CHD-001,360000". That looks like a Net Total / Final Price.
                // The prompt says "discountedRate" in "Editable Fields", but example logic is ambiguous.
                // "Editable Fields: discountedRate, netTotal".
                // Let's assume the CSV provides "discountedRate" as per "Bulk Price Update".
                // But I'll stick to updating `discountedRate`. If they want Net Total functionality, they might edit inline.
                // Wait, if I update Rate, Net Total should update? 
                // Since `netTotal` is often computed, we might need logic.
                // BUT current `priea` schema has `netTotal` as a stored field.
                // I will just update `discountedRate` as requested.
            });
            successCount++;
        }

        revalidatePath("/dashboard/admin/inventory")
        return { success: true, count: successCount, errors }
    } catch (error) {
        console.error("Bulk Update Error:", error)
        return { success: false, error: "Bulk update failed" }
    }
}
