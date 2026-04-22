
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { getAppBaseUrl, getInfoEmail } from "@/lib/runtime-config"
import { buildSiteSelectionAttachment } from "@/lib/site-selection-attachment"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const appBaseUrl = getAppBaseUrl(req)
        const body = await req.json()
        const { userId, items, totalAmount } = body

        if (!userId || !items || items.length === 0) {
            return new NextResponse("Invalid request data", { status: 400 })
        }

        // 1. Get User details
        const user = await db.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        // 2. Find or Create Customer
        let customer = await db.customer.findFirst({
            where: { email: user.email }
        })

        if (!customer) {
            customer = await db.customer.create({
                data: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone || "N/A",
                }
            })
        }

        // 3. Create Project (The Order)
        const project = await db.project.create({
            data: {
                title: `Online Campaign #${Date.now().toString().slice(-6)}`,
                customerId: customer.id,
                status: "CONFIRMED",
                remarks: `Online Order for ${items.length} locations:\n${items.map((i: any) => `- ${i.name} (${i.city}): ${i.hoardingsCount} unit(s)`).join('\n')}`,
                // Link to salesUserId? Maybe leave null or assign to a default admin/sales rep if known.
            }
        })

        // 4. Create Invoice (Optional but good for records)
        const invoice = await db.invoice.create({
            data: {
                projectId: project.id,
                invoiceNumber: `INV-${Date.now()}`,
                amount: totalAmount,
                status: "PAID",
                dueDate: new Date(),
            }
        })

        // 5. Record Payment
        // 5. Record Payment (Payment model removed, Invoice tracks status)
        /* await db.payment.create({
            data: {
                projectId: project.id,
                amount: totalAmount,
                mode: "ONLINE",
                status: "SUCCESS",
                transactionRef: `TXN_${Date.now()}`
            }
        }) */

        // 6. Emails
        const selectionAttachment = buildSiteSelectionAttachment(items, {
            filenamePrefix: `selected-sites-order-${project.id}`,
        })

        // Client Email
        const clientHtml = `
            <h2>Order Confirmation</h2>
            <p>Hi ${user.name},</p>
            <p>Thank you for your payment of <strong>₹${totalAmount.toLocaleString('en-IN')}</strong>.</p>
            <p>Your campaign order <strong>${project.title}</strong> has been successfully booked.</p>
            <p>You can check the status of your order in your <a href="${appBaseUrl}/orders">Order History</a>.</p>
            <br/>
            <h3>Order Details:</h3>
            <ul>
                ${items.map((i: any) => `<li>${i.name} - ${i.location} (${i.city})</li>`).join('')}
            </ul>
        `
        await sendEmail({
            to: user.email,
            subject: `Order Confirmation - ${project.title}`,
            html: clientHtml,
            attachments: selectionAttachment ? [selectionAttachment] : undefined,
        })

        // Admin/Sales Email
        const adminHtml = `
            <h2>New Online Order</h2>
            <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
            <p><strong>Project:</strong> ${project.title}</p>
            <p><strong>Amount:</strong> ₹${totalAmount.toLocaleString('en-IN')}</p>
            <h3>Items:</h3>
            <ul>
                ${items.map((i: any) => `<li>${i.name} - ${i.location} (${i.city})</li>`).join('')}
            </ul>
        `
        await sendEmail({
            to: getInfoEmail(),
            subject: `New Order Received - ${project.title}`,
            html: adminHtml,
            attachments: selectionAttachment ? [selectionAttachment] : undefined,
        })

        return NextResponse.json({ success: true, projectId: project.id })

    } catch (error) {
        console.error("CHECKOUT_ERROR", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
