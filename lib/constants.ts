// Payment Status Enums
export const PaymentStatus = {
    NOT_RAISED: 'NOT_RAISED',
    PENDING: 'PENDING',
    PARTIAL: 'PARTIAL',
    OVERDUE: 'OVERDUE',
    PROMISED: 'PROMISED',
    BROKEN_PROMISE: 'BROKEN_PROMISE',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

// Commitment Channel Enums
export const CommitmentChannel = {
    VERBAL: 'VERBAL',
    WHATSAPP: 'WHATSAPP',
    EMAIL: 'EMAIL',
    OTHER: 'OTHER',
} as const;

export type CommitmentChannelType = typeof CommitmentChannel[keyof typeof CommitmentChannel];

// Discount Request Status Enums
export const DiscountRequestStatus = {
    PENDING: 'PENDING',
    UNDER_REVIEW: 'UNDER_REVIEW',
    OTP_SENT: 'OTP_SENT',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CODE_GENERATED: 'CODE_GENERATED',
    APPLIED: 'APPLIED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
} as const;

export type DiscountRequestStatusType = typeof DiscountRequestStatus[keyof typeof DiscountRequestStatus];

// User Roles
export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    SALES: 'SALES',
    FINANCE: 'FINANCE',
    OPERATIONS: 'OPERATIONS',
    VENDOR: 'VENDOR',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Ops Status Enums
export const OpsStatus = {
    UNDER_PRINTING: 'UNDER_PRINTING',
    UNDER_INSTALLATION: 'UNDER_INSTALLATION',
    CLOSED: 'CLOSED',
} as const;

export type OpsStatusType = typeof OpsStatus[keyof typeof OpsStatus];

// Lead Status Enums
export const LeadStatus = {
    NEW: 'NEW',
    FOLLOW_UP: 'FOLLOW_UP',
    INTERESTED: 'INTERESTED',
    IN_PROGRESS: 'IN_PROGRESS',
    DEAL_CLOSED: 'DEAL_CLOSED',
    LOST: 'LOST',
    HANDOFF_TO_OPS: 'HANDOFF_TO_OPS',
    UNDER_PRINTING: 'UNDER_PRINTING',
    UNDER_INSTALLATION: 'UNDER_INSTALLATION',
    CLOSED: 'CLOSED',
    PROCESSING: 'PROCESSING',
} as const;

export type LeadStatusType = typeof LeadStatus[keyof typeof LeadStatus];

// Payment Transaction Mode
export const PaymentMode = {
    UPI: 'UPI',
    BANK: 'BANK',
    CASH: 'CASH',
    CHEQUE: 'CHEQUE',
    OTHER: 'OTHER',
} as const;

export type PaymentModeType = typeof PaymentMode[keyof typeof PaymentMode];

// Reminder Recipient Type
export const ReminderRecipientType = {
    CLIENT: 'CLIENT',
    SALES: 'SALES',
    FINANCE: 'FINANCE',
    ESCALATION: 'ESCALATION',
} as const;

export type ReminderRecipientTypeType = typeof ReminderRecipientType[keyof typeof ReminderRecipientType];
