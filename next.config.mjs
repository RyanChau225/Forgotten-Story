let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // {
  //   key: 'Content-Security-Policy',
  //   value: "default-src 'self'; img-src 'self' yfabebsrbzwsemfxedig.supabase.co hebbkx1anhila5yf.public.blob.vercel-storage.com data:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; frame-ancestors 'self';",
  // }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Set to true to bypass the "circular structure" crash
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Set to true to ignore minor type errors during build
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yfabebsrbzwsemfxedig.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // The webpack build worker can be unstable on some Windows setups and may crash
    // inside webpack's WasmHash implementation ("Cannot read properties of undefined (reading 'length')").
    // Disabling it makes builds more reliable (at the cost of some parallelism).
    webpackBuildWorker: false,
    // These require build workers. Keep them disabled when webpackBuildWorker is off.
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key]) &&
      nextConfig[key] !== null
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig