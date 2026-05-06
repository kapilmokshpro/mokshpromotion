import { db } from "@/lib/db"

export const getLocationLabel = (site: {
    locationName?: string | null
    city?: string | null
    district?: string | null
    state?: string | null
}) => [site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")

export async function resolveClientFromAssignment(assignmentId: string) {
    const assignment = await db.vendorSiteAssignment.findUnique({
        where: { id: assignmentId },
        include: {
            lead: {
                select: {
                    id: true,
                    customerName: true,
                    email: true,
                }
            },
            leadCampaignItem: {
                include: {
                    lead: {
                        select: {
                            id: true,
                            customerName: true,
                            email: true,
                        }
                    }
                }
            },
            inventoryHoarding: {
                select: {
                    currentLeadId: true
                }
            }
        }
    })

    if (!assignment) return null

    const directLead = assignment.lead
    if (directLead?.email) {
        return {
            email: directLead.email,
            clientName: directLead.customerName,
            campaignName: `Lead #${directLead.id}`,
        }
    }

    const campaignLead = assignment.leadCampaignItem?.lead
    if (campaignLead?.email) {
        return {
            email: campaignLead.email,
            clientName: campaignLead.customerName,
            campaignName: `Lead #${campaignLead.id}`,
        }
    }

    if (assignment.inventoryHoarding.currentLeadId) {
        const linkedLead = await db.lead.findUnique({
            where: { id: assignment.inventoryHoarding.currentLeadId },
            select: { id: true, customerName: true, email: true }
        })
        if (linkedLead?.email) {
            return {
                email: linkedLead.email,
                clientName: linkedLead.customerName,
                campaignName: `Lead #${linkedLead.id}`,
            }
        }
    }

    return null
}

