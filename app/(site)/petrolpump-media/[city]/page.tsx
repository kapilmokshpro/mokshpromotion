import { db } from "@/lib/db"
import CityHoardingTable from "@/components/CityHoardingTable"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { resolveSiteMediaUrl } from "@/lib/site-media"

type NullableNumberLike = number | string | null | undefined

interface RawCityHoarding {
    id: number
    outletName: string | null
    name: string | null
    locationName: string | null
    location: string | null
    state: string | null
    district: string | null
    city: string | null
    hoardingsCount: number | null
    width: NullableNumberLike
    widthFt: NullableNumberLike
    height: NullableNumberLike
    heightFt: NullableNumberLike
    totalArea: NullableNumberLike
    areaSqft: NullableNumberLike
    rate: NullableNumberLike
    ratePerSqft: NullableNumberLike
    printingCharge: NullableNumberLike
    netTotal: NullableNumberLike
    computedNetTotal: NullableNumberLike
    imageUrl: string | null
    view360Url: string | null
    siteMedia: Array<{
        type: "IMAGE" | "VIDEO"
        key: string
        url: string | null
    }>
}

const toNumber = (value: NullableNumberLike): number | null => {
    if (value === null || value === undefined || value === "") return null
    const num = Number(value)
    return Number.isNaN(num) ? null : num
}

export default async function CityMediaPage({ params }: { params: { city: string } }) {
    const cityName = decodeURIComponent(params.city)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let cityHoardings: RawCityHoarding[] = []
    let dbUnavailable = false

    try {
        cityHoardings = (await db.inventoryHoarding.findMany({
            where: {
                isActive: true,
                leadItems: {
                    none: {
                        bookingEndDate: {
                            not: null,
                            gte: today,
                        },
                    },
                },
                OR: [
                    { district: { equals: cityName, mode: "insensitive" } },
                    { city: { equals: cityName, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                outletName: true,
                name: true,
                locationName: true,
                location: true,
                state: true,
                district: true,
                city: true,
                hoardingsCount: true,
                width: true,
                widthFt: true,
                height: true,
                heightFt: true,
                totalArea: true,
                areaSqft: true,
                rate: true,
                ratePerSqft: true,
                printingCharge: true,
                netTotal: true,
                computedNetTotal: true,
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
            orderBy: { location: "asc" },
        })) as RawCityHoarding[]
    } catch (error) {
        console.error(`City inventory fetch failed (${cityName}):`, error)

        const isSchemaMismatch =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "P2022"

        if (isSchemaMismatch) {
            try {
                cityHoardings = (await db.inventoryHoarding.findMany({
                    where: {
                        isActive: true,
                        leadItems: {
                            none: {
                                bookingEndDate: {
                                    not: null,
                                    gte: today,
                                },
                            },
                        },
                        OR: [
                            { district: { equals: cityName, mode: "insensitive" } },
                            { city: { equals: cityName, mode: "insensitive" } },
                        ],
                    },
                    select: {
                        id: true,
                        outletName: true,
                        name: true,
                        locationName: true,
                        location: true,
                        state: true,
                        district: true,
                        city: true,
                        hoardingsCount: true,
                        width: true,
                        widthFt: true,
                        height: true,
                        heightFt: true,
                        totalArea: true,
                        areaSqft: true,
                        rate: true,
                        ratePerSqft: true,
                        printingCharge: true,
                        netTotal: true,
                        computedNetTotal: true,
                        imageUrl: true,
                    },
                    orderBy: { location: "asc" },
                })) as RawCityHoarding[]
            } catch (fallbackError) {
                dbUnavailable = true
                console.error(`City inventory fallback fetch failed (${cityName}):`, fallbackError)
            }
        } else {
            dbUnavailable = true
        }
    }

    if (dbUnavailable) {
        return (
            <div className="min-h-screen bg-gray-50 pt-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <Link href="/petrolpump-media" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to All Locations
                    </Link>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
                        Unable to load inventory for {cityName} right now because the database is unreachable. Please try again shortly.
                    </div>
                </div>
            </div>
        )
    }

    if (cityHoardings.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 pt-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <Link href="/petrolpump-media" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to All Locations
                    </Link>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">No media found for {cityName}</h1>
                        <p className="mt-2 text-gray-600">Please try another location.</p>
                    </div>
                </div>
            </div>
        )
    }

    const normalizedHoardings = cityHoardings.map((h) => {
        const row = h as unknown as RawCityHoarding
        return {
            ...row,
            location: row.location ?? row.locationName ?? "",
            city: row.city ?? "",
            state: row.state ?? "",
            district: row.district ?? "",
            name: row.name ?? row.outletName ?? "N/A",
            hoardingsCount: row.hoardingsCount ?? 1,
            width: toNumber(row.width),
            widthFt: toNumber(row.widthFt),
            height: toNumber(row.height),
            heightFt: toNumber(row.heightFt),
            totalArea: toNumber(row.totalArea),
            areaSqft: toNumber(row.areaSqft),
            rate: toNumber(row.rate),
            ratePerSqft: toNumber(row.ratePerSqft),
            printingCharge: toNumber(row.printingCharge),
            netTotal: toNumber(row.netTotal),
            computedNetTotal: toNumber(row.computedNetTotal),
            view360Url: row.view360Url || null,
            imageUrl: row.imageUrl || null,
            mediaImages: (Array.isArray(row.siteMedia) ? row.siteMedia : [])
                .filter((media) => media.type === "IMAGE")
                .slice(0, 5)
                .map((media) => resolveSiteMediaUrl(media))
                .filter((url): url is string => typeof url === "string" && url.length > 0),
            mediaVideoUrl: (Array.isArray(row.siteMedia) ? row.siteMedia : [])
                .filter((media) => media.type === "VIDEO")
                .slice(0, 1)
                .map((media) => resolveSiteMediaUrl(media))
                .find((url): url is string => typeof url === "string" && url.length > 0) || null,
        }
    })

    return (
        <main className="min-h-screen bg-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-6">
                    <Link href="/petrolpump-media" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to All Locations
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{cityName}</h1>
                    <p className="text-gray-500 mt-1">Found {normalizedHoardings.length} advertising locations</p>
                </div>

                <CityHoardingTable hoardings={normalizedHoardings} />
            </div>
        </main>
    )
}
