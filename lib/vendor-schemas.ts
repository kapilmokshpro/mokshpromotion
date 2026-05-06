import { z } from "zod"

export const createVendorSchema = z.object({
    name: z.string().trim().min(1, "Vendor name is required"),
    email: z.string().trim().toLowerCase().email("Valid email is required"),
    phone: z.string().trim().optional().or(z.literal("")),
    companyName: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean().optional().default(true),
})

export const createVendorAssignmentSchema = z.object({
    vendorId: z.number().int().positive(),
    inventoryHoardingIds: z.array(z.number().int().positive()).min(1, "Select at least one site"),
    leadId: z.number().int().positive().optional(),
    leadCampaignItemId: z.number().int().positive().optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
})

export const vendorProofRejectSchema = z.object({
    reason: z.string().trim().min(2, "Rejection reason is required"),
})

export const vendorProofApproveSchema = z.object({
    notifyClient: z.boolean().optional().default(true),
})

