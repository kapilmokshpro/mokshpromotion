import { db } from "@/lib/db"
import CartFooter from "@/components/CartFooter"
import InventoryList from "@/components/InventoryList"
import { resolveSiteMediaUrl } from "@/lib/site-media"

export default async function PetrolPumpMediaPage() {
    // Fetch Inventory Data - Filtered to AVAILABLE only
    // Update: Hide if bookingEndDate >= Today (Active or Upcoming booking exists)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    let inventory: any[] = []
    let dbUnavailable = false

    try {
        inventory = await (db.inventoryHoarding.findMany as any)({
            where: {
                isActive: true, // Only show active items
                // Logic: Not Exists a LeadItem where bookingEndDate >= Today
                leadItems: {
                    none: {
                        bookingEndDate: {
                            not: null, // Ensure not null
                            gte: today // Current or Future booking (covers Active and Upcoming)
                        }
                    }
                }
            },
            select: {
                id: true,
                outletName: true,
                locationName: true,
                state: true,
                district: true,
                widthFt: true,
                heightFt: true,
                width: true,
                height: true,
                ratePerSqft: true,
                discountedRate: true,
                rate: true,
                areaType: true,
                totalArea: true,
                areaSqft: true,
                printingCharge: true,
                installationCharge: true,
                netTotal: true,
                availabilityStatus: true,
                imageUrl: true,
                view360Url: true,
                siteMedia: {
                    where: { isActive: true },
                    orderBy: [
                        { type: "asc" },
                        { sortOrder: "asc" },
                        { createdAt: "asc" },
                    ],
                    select: {
                        type: true,
                        key: true,
                        url: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    } catch (error) {
        console.error("Public inventory fetch failed:", error)

        const isSchemaMismatch =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "P2022"

        if (isSchemaMismatch) {
            try {
                inventory = await (db.inventoryHoarding.findMany as any)({
                    where: {
                        isActive: true,
                        leadItems: {
                            none: {
                                bookingEndDate: {
                                    not: null,
                                    gte: today
                                }
                            }
                        }
                    },
                    select: {
                        id: true,
                        outletName: true,
                        locationName: true,
                        state: true,
                        district: true,
                        widthFt: true,
                        heightFt: true,
                        width: true,
                        height: true,
                        ratePerSqft: true,
                        discountedRate: true,
                        rate: true,
                        areaType: true,
                        totalArea: true,
                        areaSqft: true,
                        printingCharge: true,
                        installationCharge: true,
                        netTotal: true,
                        availabilityStatus: true,
                        imageUrl: true,
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                })
            } catch (fallbackError) {
                dbUnavailable = true
                console.error("Public inventory fallback fetch failed:", fallbackError)
            }
        } else {
            dbUnavailable = true
        }
    }

    // Transform Prisma Decimals to numbers for client component and strip extra fields
    const serializedInventory = inventory.map((item: any) => ({
        id: item.id,
        outletName: item.outletName,
        locationName: item.locationName,
        state: item.state,
        district: item.district,
        widthFt: item.widthFt ? Number(item.widthFt) : null,
        heightFt: item.heightFt ? Number(item.heightFt) : null,
        width: item.width ? Number(item.width) : null,
        height: item.height ? Number(item.height) : null,
        ratePerSqft: item.ratePerSqft ? Number(item.ratePerSqft) : null,
        discountedRate: item.discountedRate ? Number(item.discountedRate) : null,
        rate: item.rate ? Number(item.rate) : null,
        areaType: item.areaType,
        totalArea: item.totalArea ? Number(item.totalArea) : null,
        areaSqft: item.areaSqft ? Number(item.areaSqft) : null,
        printingCharge: item.printingCharge ? Number(item.printingCharge) : null,
        installationCharge: item.installationCharge ? Number(item.installationCharge) : null,
        netTotal: item.netTotal ? Number(item.netTotal) : null,
        view360Url: item.view360Url || null,
        imageUrl: item.imageUrl || null,
        mediaImages: (Array.isArray(item.siteMedia) ? item.siteMedia : [])
            .filter((media: any) => media.type === "IMAGE")
            .slice(0, 5)
            .map((media: any) => resolveSiteMediaUrl(media))
            .filter((url: string | null): url is string => typeof url === "string" && url.length > 0),
        mediaVideoUrl: (Array.isArray(item.siteMedia) ? item.siteMedia : [])
            .filter((media: any) => media.type === "VIDEO")
            .slice(0, 1)
            .map((media: any) => resolveSiteMediaUrl(media))
            .find((url: string | null): url is string => typeof url === "string" && url.length > 0) || null,
    }));

    return (
        <main className="min-h-screen bg-white py-20 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

                {/* Inventory List Section */}
                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-[#002147] mb-8 text-center uppercase tracking-wide">
                        Available Inventory
                    </h2>

                    {dbUnavailable && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            Inventory is temporarily unavailable because the database connection failed. Please refresh in a few minutes.
                        </div>
                    )}

                    <InventoryList inventory={serializedInventory} />
                </div>

            </div>
            <CartFooter />
        </main>
    )
}
