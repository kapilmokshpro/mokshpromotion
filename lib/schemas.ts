import { z } from "zod"

export const leadSchema = z.object({
    customerName: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    email: z.string().email().optional().or(z.literal("")),
    source: z.string().optional(),
    status: z.enum(["NEW", "FOLLOW_UP", "INTERESTED", "IN_PROGRESS", "DEAL_CLOSED", "LOST"]).default("NEW"),
    notes: z.string().optional(),
    assigneeId: z.number().optional()
})

export const customerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Valid phone number required"),
    email: z.string().email().optional().or(z.literal("")),
    company: z.string().optional(),
    address: z.string().optional(),
})

export const projectSchema = z.object({
    title: z.string().min(1, "Title is required"),
    customerId: z.number().int().positive(),
    status: z.enum(["DRAFT", "IN_SALES", "IN_FINANCE", "IN_OPERATIONS", "COMPLETED", "CANCELLED"]).default("DRAFT"),
    discountPercent: z.number().min(0).max(100).optional(),
    couponCode: z.string().optional(),
    remarks: z.string().optional(),
    salesUserId: z.number().int().optional()
})

export const userCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "SALES", "FINANCE", "OPERATIONS", "VENDOR", "SITE_MEDIA"]).default("SALES")
})

export const userUpdateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["ADMIN", "SALES", "FINANCE", "OPERATIONS", "VENDOR", "SITE_MEDIA"]),
    password: z.union([
        z.string().length(0),
        z.string().min(6, "Password must be at least 6 characters"),
    ]).optional().default(""),
})
