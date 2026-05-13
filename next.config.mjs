import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

const IMAGE_HOST_ENV_KEYS = [
    'SITE_MEDIA_PUBLIC_BASE_URL',
    'VENDOR_MEDIA_PUBLIC_BASE_URL',
    'VENDOR_MEDIA_R2_PUBLIC_BASE_URL',
    'R2_PUBLIC_URL',
    'R2_ENDPOINT',
    'VENDOR_MEDIA_R2_ENDPOINT',
    'VENDOR_MEDIA_S3_ENDPOINT',
]

const getPatternFromUrl = (value) => {
    if (!value) return null
    try {
        const parsed = new URL(value)
        return {
            protocol: parsed.protocol.replace(':', ''),
            hostname: parsed.hostname,
            port: parsed.port || '',
            pathname: '/**',
        }
    } catch {
        return null
    }
}

const envRemotePatterns = IMAGE_HOST_ENV_KEYS
    .map((key) => getPatternFromUrl(process.env[key]))
    .filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Keep dev/prod build artifacts separate to avoid stale asset conflicts.
    distDir: process.env.NEXT_DIST_DIR || '.next',

    // Performance optimizations
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },

    // Image optimization
    images: {
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 60,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.r2.dev',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.cloudflarestorage.com',
                pathname: '/**',
            },
            ...envRemotePatterns,
        ],
    },

    // Experimental features for better performance
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns'],
    },

    // SWC minification (faster than Terser)
    swcMinify: true,
};

export default withBundleAnalyzer(nextConfig);
