type RawSelectionItem = {
    id?: unknown
    name?: unknown
    outletName?: unknown
    location?: unknown
    locationName?: unknown
    district?: unknown
    city?: unknown
    state?: unknown
    width?: unknown
    widthFt?: unknown
    height?: unknown
    heightFt?: unknown
    totalArea?: unknown
    areaSqft?: unknown
    hoardingsCount?: unknown
    rate?: unknown
    ratePerSqft?: unknown
    printingCharge?: unknown
    netTotal?: unknown
}

type NormalizedSelectionItem = {
    id: string
    outletName: string
    location: string
    district: string
    city: string
    state: string
    widthFt: string
    heightFt: string
    areaSqft: string
    quantity: string
    rate: string
    printingCharge: string
    netTotal: string
}

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const toNumber = (value: unknown): number | null => {
    const num = Number(value)
    if (!Number.isFinite(num)) return null
    return num
}

const toPositiveInt = (value: unknown): number | null => {
    const num = Number(value)
    if (!Number.isInteger(num) || num <= 0) return null
    return num
}

const toCsvCell = (value: string) => `"${value.replaceAll('"', '""')}"`

const toMoney = (value: unknown) => {
    const num = toNumber(value)
    if (num === null || num < 0) return "0"
    return num.toFixed(2)
}

const toDimension = (primary: unknown, fallback: unknown) => {
    const first = toNumber(primary)
    if (first !== null && first > 0) return first.toString()
    const second = toNumber(fallback)
    if (second !== null && second > 0) return second.toString()
    return ""
}

const toArea = (primary: unknown, fallback: unknown) => {
    const first = toNumber(primary)
    if (first !== null && first > 0) return first.toString()
    const second = toNumber(fallback)
    if (second !== null && second > 0) return second.toString()
    return ""
}

const normalizeItem = (item: RawSelectionItem, fallbackCity?: string): NormalizedSelectionItem => {
    const id = toPositiveInt(item.id)
    const qty = toPositiveInt(item.hoardingsCount) || 1
    const city = toText(item.city) || toText(item.district) || (fallbackCity || "")

    return {
        id: id ? String(id) : "",
        outletName: toText(item.name) || toText(item.outletName) || "N/A",
        location: toText(item.location) || toText(item.locationName) || "N/A",
        district: toText(item.district) || "N/A",
        city: city || "N/A",
        state: toText(item.state) || "N/A",
        widthFt: toDimension(item.width, item.widthFt),
        heightFt: toDimension(item.height, item.heightFt),
        areaSqft: toArea(item.totalArea, item.areaSqft),
        quantity: String(qty),
        rate: toMoney(item.rate ?? item.ratePerSqft),
        printingCharge: toMoney(item.printingCharge),
        netTotal: toMoney(item.netTotal),
    }
}

const toDateStamp = (date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export type SiteSelectionAttachment = {
    filename: string
    content: string
}

export const buildSiteSelectionAttachment = (
    items: unknown,
    options?: { filenamePrefix?: string; fallbackCity?: string }
): SiteSelectionAttachment | null => {
    if (!Array.isArray(items) || items.length === 0) return null

    const normalizedItems = items.map((item) =>
        normalizeItem((item || {}) as RawSelectionItem, options?.fallbackCity)
    )

    if (normalizedItems.length === 0) return null

    const headers = [
        "Site ID",
        "Outlet Name",
        "Location",
        "District",
        "City",
        "State",
        "Width (ft)",
        "Height (ft)",
        "Area (sqft)",
        "Quantity",
        "Rate",
        "Printing Charge",
        "Net Total",
    ]

    const rows = normalizedItems.map((item) =>
        [
            item.id,
            item.outletName,
            item.location,
            item.district,
            item.city,
            item.state,
            item.widthFt,
            item.heightFt,
            item.areaSqft,
            item.quantity,
            item.rate,
            item.printingCharge,
            item.netTotal,
        ]
            .map(toCsvCell)
            .join(",")
    )

    const csv = `\uFEFF${headers.map(toCsvCell).join(",")}\n${rows.join("\n")}`
    const content = Buffer.from(csv, "utf8").toString("base64")
    const prefix = options?.filenamePrefix || "selected-sites"
    const filename = `${prefix}-${toDateStamp()}.csv`

    return { filename, content }
}
