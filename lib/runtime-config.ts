const DEFAULT_DEV_APP_URL = "http://localhost:3000"
const DEFAULT_ADMIN_EMAIL = "admin@mokshpromotion.com"
const DEFAULT_INFO_EMAIL = "info@mokshpromotion.com"

const normalizeBaseUrl = (value?: string) => {
    const trimmed = (value || "").trim()
    if (!trimmed) return ""

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return withProtocol.replace(/\/+$/, "")
}

const isLocalHostUrl = (url: string) => {
    try {
        const parsed = new URL(url)
        return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
    } catch {
        return false
    }
}

const buildFromRequestHost = (req?: Request) => {
    const forwardedHost = req?.headers.get("x-forwarded-host") || req?.headers.get("host")
    if (!forwardedHost) return ""

    const forwardedProto =
        req?.headers.get("x-forwarded-proto") ||
        (forwardedHost.includes("localhost") || forwardedHost.startsWith("127.0.0.1") ? "http" : "https")
    return `${forwardedProto}://${forwardedHost}`
}

export const getAppBaseUrl = (req?: Request) => {
    const envBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL)
    const requestBase = buildFromRequestHost(req)

    // If env is set to localhost but request is from production domain, prefer request host
    if (envBaseUrl) {
        if (requestBase && isLocalHostUrl(envBaseUrl) && !isLocalHostUrl(requestBase)) {
            return requestBase
        }
        return envBaseUrl
    }

    if (requestBase) return requestBase

    const vercelBaseUrl = normalizeBaseUrl(process.env.VERCEL_URL)
    if (vercelBaseUrl) return vercelBaseUrl

    return DEFAULT_DEV_APP_URL
}

export const getSuperAdminEmail = () => {
    return (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim()
}

export const getInfoEmail = () => {
    return (process.env.INFO_EMAIL || process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || DEFAULT_INFO_EMAIL).trim()
}
