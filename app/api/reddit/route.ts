import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.REDDIT_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET ?? '';
const USER_AGENT = 'web:world-cup-story:1.0 (by /u/kaigreaves)';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  if (!CLIENT_ID || !CLIENT_SECRET) return null;
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const json = await res.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const token = await getToken();
  // Rewrite www.reddit.com → oauth.reddit.com when using token
  const url = token ? rawUrl.replace('https://www.reddit.com/', 'https://oauth.reddit.com/') : rawUrl;

  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers, next: { revalidate: 0 } });
    if (!res.ok) return NextResponse.json({ error: res.status }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
