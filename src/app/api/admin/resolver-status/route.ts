import { NextResponse } from 'next/server';
import { TeraBoxResolver } from '@/lib/providers/terabox';

const PROBE_URL = process.env.TERABOX_PROBE_URL!;   // known-good test link (.env)
const PROBE_TTL = 10 * 60 * 1000;                   // 10 min cache

let probeCache: { ok: boolean; message: string; checkedAt: number } | null = null;
const teraboxResolver = new TeraBoxResolver();

export async function GET(request: Request) {
  // TODO: admin auth check

  const configured = !!process.env.TERABOX_NDUS_COOKIE;

  if (!configured) {
    return NextResponse.json({
      terabox: { configured: false, ok: false, message: 'TERABOX_NDUS_COOKIE missing' },
    });
  }

  // Presence check nahi — REAL probe (cookie expired hai ya nahi, yahi batayega)
  if (!probeCache || Date.now() - probeCache.checkedAt > PROBE_TTL) {
    try {
      if (!PROBE_URL) {
        throw new Error('TERABOX_PROBE_URL is not set in .env');
      }
      const resolved = await teraboxResolver.resolve(PROBE_URL);
      probeCache = {
        ok: resolved.success,
        message: resolved.success ? 'OK' : (resolved.error?.message ?? 'Resolve failed'),
        checkedAt: Date.now(),
      };
    } catch (e: any) {
      probeCache = { ok: false, message: e?.message ?? 'Probe crashed', checkedAt: Date.now() };
    }
  }

  return NextResponse.json({
    terabox: {
      configured: true,
      ok: probeCache.ok,
      message: probeCache.message,
      lastChecked: probeCache.checkedAt,
    },
  });
}
