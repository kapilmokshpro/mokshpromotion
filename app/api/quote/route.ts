import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { getInfoEmail } from "@/lib/runtime-config"
import { buildSiteSelectionAttachment } from "@/lib/site-selection-attachment"
import { NextResponse } from "next/server"

type QuoteItemInput = {
    id?: unknown
    name?: unknown
    location?: unknown
    city?: unknown
    state?: unknown
    district?: unknown
    hoardingsCount?: unknown
    width?: unknown
    height?: unknown
    totalArea?: unknown
    rate?: unknown
    printingCharge?: unknown
    netTotal?: unknown
}

type NormalizedQuoteItem = {
    id: number
    name: string
    location: string
    city: string
    state: string
    district: string
    hoardingsCount: number
    width: number | null
    height: number | null
    totalArea: number | null
    rate: number
    printingCharge: number
    netTotal: number
}

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const toPositiveInt = (value: unknown): number | null => {
    const num = Number(value)
    if (!Number.isInteger(num) || num <= 0) return null
    return num
}

const toMoney = (value: unknown): number => {
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0) return 0
    return num
}

const toOptionalNumber = (value: unknown): number | null => {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return null
    return num
}

const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isPhone = (value: string) => /^[0-9+\-() ]{7,20}$/.test(value)

const getEmailWarningMessage = (
    target: "admin" | "client",
    result: { code?: string; reason?: "AUTH_FAILED" | "SEND_FAILED" }
) => {
    if (result.reason === "AUTH_FAILED" || result.code === "EAUTH") {
        // Do not expose provider auth configuration issues to end users.
        return null
    }
    return target === "admin"
        ? "Admin notification email failed."
        : "Client confirmation email failed."
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Record<string, unknown>

        const name = toText(body.name)
        const email = toText(body.email).toLowerCase()
        const phone = toText(body.phone)
        const city = toText(body.city)
        const notes = toText(body.notes ?? body.requirements)
        const serviceInterest = toText(body.serviceInterest) || null

        if (!name || !email || !phone || !city) {
            return NextResponse.json(
                { success: false, error: "Please fill all required fields." },
                { status: 400 }
            )
        }

        if (!isEmail(email)) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid email address." },
                { status: 400 }
            )
        }

        if (!isPhone(phone)) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid phone number." },
                { status: 400 }
            )
        }

        const rawItems = Array.isArray(body.items) ? (body.items as QuoteItemInput[]) : []
        const normalizedItems = rawItems
            .map((item) => {
                const id = toPositiveInt(item?.id)
                if (!id) return null

                return {
                    id,
                    name: toText(item?.name) || "Hoarding",
                    location: toText(item?.location) || "N/A",
                    city: toText(item?.city) || city,
                    state: toText(item?.state) || "N/A",
                    district: toText(item?.district) || "N/A",
                    hoardingsCount: toPositiveInt(item?.hoardingsCount) || 1,
                    width: toOptionalNumber(item?.width),
                    height: toOptionalNumber(item?.height),
                    totalArea: toOptionalNumber(item?.totalArea),
                    rate: toMoney(item?.rate),
                    printingCharge: toMoney(item?.printingCharge),
                    netTotal: toMoney(item?.netTotal),
                } satisfies NormalizedQuoteItem
            })
            .filter((item): item is NormalizedQuoteItem => item !== null)

        if (!serviceInterest && normalizedItems.length === 0) {
            return NextResponse.json(
                { success: false, error: "No valid locations found in cart. Please reselect your inventory." },
                { status: 400 }
            )
        }

        let validItems: NormalizedQuoteItem[] = []
        let skippedItems = 0

        if (normalizedItems.length > 0) {
            const existingInventory = await db.inventoryHoarding.findMany({
                where: { id: { in: normalizedItems.map((item) => item.id) } },
                select: { id: true },
            })

            const validIdSet = new Set(existingInventory.map((row) => row.id))
            validItems = normalizedItems.filter((item) => validIdSet.has(item.id))
            skippedItems = normalizedItems.length - validItems.length
        }

        if (!serviceInterest && validItems.length === 0) {
            return NextResponse.json(
                { success: false, error: "Selected locations are no longer available. Please refresh and try again." },
                { status: 400 }
            )
        }

        const baseTotal = validItems.reduce((sum, item) => sum + item.netTotal, 0)
        const itemCount = validItems.length

        let noteText = serviceInterest
            ? `Interested in Service: ${serviceInterest}. City: ${city}.`
            : `City: ${city}. Interested in ${itemCount} locations.`

        if (skippedItems > 0) {
            noteText += ` Skipped ${skippedItems} invalid/removed item(s).`
        }
        if (notes) {
            noteText += ` Client note: ${notes}`
        }

        const lead = await db.lead.create({
            data: {
                customerName: name,
                email,
                phone,
                source: serviceInterest ? "WEBSITE_SERVICE_INQUIRY" : "WEBSITE_CART_QUOTE",
                status: "NEW",
                notes: noteText,
                baseTotal,
                finalTotal: baseTotal,
                campaignItems:
                    validItems.length > 0
                        ? {
                              create: validItems.map((item) => ({
                                  inventoryHoardingId: item.id,
                                  rate: item.rate,
                                  printingCharge: item.printingCharge,
                                  total: item.netTotal,
                              })),
                          }
                        : undefined,
            },
        })

        const requestPlan = serviceInterest || "Petrol Pump Media Quote"
        const selectionAttachment =
            validItems.length > 0
                ? buildSiteSelectionAttachment(validItems, {
                      filenamePrefix: `selected-sites-lead-${lead.id}`,
                      fallbackCity: city,
                  })
                : null

        const safeName = escapeHtml(name)
        const safeEmail = escapeHtml(email)
        const safePhone = escapeHtml(phone)
        const safeCity = escapeHtml(city)
        const safeRequestPlan = escapeHtml(requestPlan)
        const safeNotes = notes ? escapeHtml(notes) : ""

        const itemsHtml =
            validItems.length > 0
                ? `
                    <h3>Selected Sites (${validItems.length}):</h3>
                    <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr>
                                <th style="text-align:left; border:1px solid #ddd; padding:8px;">Site</th>
                                <th style="text-align:left; border:1px solid #ddd; padding:8px;">Location</th>
                                <th style="text-align:left; border:1px solid #ddd; padding:8px;">District</th>
                                <th style="text-align:left; border:1px solid #ddd; padding:8px;">City / State</th>
                                <th style="text-align:left; border:1px solid #ddd; padding:8px;">Size</th>
                                <th style="text-align:center; border:1px solid #ddd; padding:8px;">Qty</th>
                                <th style="text-align:right; border:1px solid #ddd; padding:8px;">Rate</th>
                                <th style="text-align:right; border:1px solid #ddd; padding:8px;">Printing</th>
                                <th style="text-align:right; border:1px solid #ddd; padding:8px;">Net Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${validItems
                                .map((item) => {
                                    const sizeText =
                                        item.width && item.height ? `${item.width} x ${item.height} ft` : "N/A"
                                    const areaText = item.totalArea ? `${item.totalArea} sq.ft` : "N/A"
                                    return `<tr>
                                        <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(item.name)}</td>
                                        <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(item.location)}</td>
                                        <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(item.district)}</td>
                                        <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(item.city)}, ${escapeHtml(item.state)}</td>
                                        <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(sizeText)}<br/><small>Area: ${escapeHtml(areaText)}</small></td>
                                        <td style="border:1px solid #ddd; padding:8px; text-align:center;">${item.hoardingsCount}</td>
                                        <td style="border:1px solid #ddd; padding:8px; text-align:right;">INR ${item.rate.toLocaleString("en-IN")}</td>
                                        <td style="border:1px solid #ddd; padding:8px; text-align:right;">INR ${item.printingCharge.toLocaleString("en-IN")}</td>
                                        <td style="border:1px solid #ddd; padding:8px; text-align:right;">INR ${item.netTotal.toLocaleString("en-IN")}</td>
                                    </tr>`
                                })
                                .join("")}
                        </tbody>
                    </table>
                `
                : `<p><strong>Selected Plan:</strong> ${safeRequestPlan}</p>`

        const noteHtml = safeNotes
            ? `<p><strong>Client Note:</strong> ${safeNotes}</p>`
            : `<p><strong>Client Note:</strong> Not provided</p>`

        const adminHtml = `
            <h2>New Quote Request</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Phone:</strong> ${safePhone}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>City:</strong> ${safeCity}</p>
            <p><strong>Selected Plan:</strong> ${safeRequestPlan}</p>
            ${baseTotal > 0 ? `<p><strong>Estimated value:</strong> INR ${baseTotal.toLocaleString("en-IN")}</p>` : ""}
            ${noteHtml}
            ${itemsHtml}
        `

        const emailWarnings: string[] = []

        const adminEmailResult = await sendEmail({
            to: getInfoEmail(),
            subject: `New Quote Request from ${name} (${requestPlan})`,
            html: adminHtml,
            attachments: selectionAttachment ? [selectionAttachment] : undefined,
        })
        if (!adminEmailResult.success) {
            const warning = getEmailWarningMessage("admin", adminEmailResult)
            if (warning) emailWarnings.push(warning)
        }

        const clientMessage = serviceInterest
            ? `<p>We have received your inquiry for <strong>${safeRequestPlan}</strong>.</p>`
            : `<p>We have received your request for <strong>${validItems.length} selected site(s)</strong>.</p>`

        const clientEmailResult = await sendEmail({
            to: email,
            subject: "We received your quote request",
            html: `
                <h2>Thank you for your interest!</h2>
                <p>Hi ${safeName},</p>
                ${clientMessage}
                <p><strong>Selected Plan:</strong> ${safeRequestPlan}</p>
                <p><strong>City:</strong> ${safeCity}</p>
                ${noteHtml}
                ${itemsHtml}
                ${baseTotal > 0 ? `<p><strong>Estimated value:</strong> INR ${baseTotal.toLocaleString("en-IN")}</p>` : ""}
                <p>Our team will get back to you shortly with detailed assistance.</p>
                <br/>
                <p>Best Regards,<br/>Moksh Promotion Team</p>
            `,
            attachments: selectionAttachment ? [selectionAttachment] : undefined,
        })
        if (!clientEmailResult.success) {
            const warning = getEmailWarningMessage("client", clientEmailResult)
            if (warning) emailWarnings.push(warning)
        }

        const uniqueWarnings = Array.from(new Set(emailWarnings))

        return NextResponse.json({
            success: true,
            leadId: lead.id,
            skippedItems,
            warning: uniqueWarnings.length > 0 ? uniqueWarnings.join(" ") : undefined,
        })
    } catch (error) {
        console.error("QUOTE_API_ERROR", error)

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return NextResponse.json(
                { success: false, error: "Database is temporarily unavailable. Please try again in a few minutes." },
                { status: 503 }
            )
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2003") {
                return NextResponse.json(
                    { success: false, error: "One or more selected locations are invalid. Please refresh and retry." },
                    { status: 400 }
                )
            }
        }

        return NextResponse.json(
            { success: false, error: "Failed to process quote request. Please try again." },
            { status: 500 }
        )
    }
}
