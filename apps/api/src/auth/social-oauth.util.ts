import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

const META_PLATFORMS = new Set([
  'instagram',
  'messenger',
  'facebook',
  'facebook_pages',
  'whatsapp',
]);

function isMockOAuthCode(code: string): boolean {
  return code.startsWith('mock_');
}

export function allowMockSocialOAuth(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_MOCK_SOCIAL_OAUTH === 'true'
  );
}

/**
 * Exchange provider authorization code for an access token.
 * Meta family shares Graph API; TikTok uses Open API v2 token endpoint.
 */
export async function exchangeSocialOAuthCode(
  platform: string,
  code: string,
  redirectUri: string,
): Promise<string> {
  if (isMockOAuthCode(code)) {
    if (!allowMockSocialOAuth()) {
      throw new BadRequestException(
        'Mock OAuth codes are not allowed in production',
      );
    }
    return `mock_${platform}_access_token_${Date.now()}`;
  }

  const p = platform.toLowerCase();

  if (META_PLATFORMS.has(p)) {
    return exchangeMetaOAuthCode(code, redirectUri);
  }

  if (p === 'tiktok') {
    return exchangeTikTokOAuthCode(code, redirectUri);
  }

  throw new BadRequestException(`Unsupported OAuth platform: ${platform}`);
}

async function exchangeMetaOAuthCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new ServiceUnavailableException(
      'Meta OAuth is not configured (META_APP_ID / META_APP_SECRET)',
    );
  }

  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const res = await fetch(tokenUrl.toString(), { method: 'GET' });
  const data = (await res.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.access_token) {
    const msg =
      data.error?.message ||
      `Meta token exchange failed (${res.status})`;
    throw new BadRequestException(msg);
  }

  return data.access_token;
}

async function exchangeTikTokOAuthCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientKey =
    process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_APP_ID;
  const clientSecret =
    process.env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_APP_SECRET;

  if (!clientKey || !clientSecret) {
    throw new ServiceUnavailableException(
      'TikTok OAuth is not configured (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)',
    );
  }

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const data = (await res.json()) as {
    data?: { access_token?: string; error_code?: number; description?: string };
    access_token?: string;
    error?: string;
    error_description?: string;
    message?: string;
  };

  const token = data.data?.access_token ?? data.access_token;
  if (!res.ok || !token) {
    const msg =
      data.data?.description ||
      data.error_description ||
      data.error ||
      data.message ||
      `TikTok token exchange failed (${res.status})`;
    throw new BadRequestException(msg);
  }

  return token;
}

export function isMetaPlatform(platform: string): boolean {
  return META_PLATFORMS.has(platform.toLowerCase());
}

export function isTikTokPlatform(platform: string): boolean {
  return platform.toLowerCase() === 'tiktok';
}
