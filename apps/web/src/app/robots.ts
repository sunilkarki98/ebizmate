import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || 'https://ebizmate.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/', '/api/', '/_next/', '/dashboard/*', '/admin/*'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
