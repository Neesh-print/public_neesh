import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { clientIp } from './signals';

// Fixed-window rate limiting for the public routes. With Upstash Redis
// connected (UPSTASH_REDIS_REST_* or the Marketplace's KV_REST_API_*
// variables), counts are shared across every serverless instance. Without
// them, or if Redis does not answer within a second, it falls back to a
// per-instance in-memory counter: weaker, since each warm instance counts
// separately, but it still blunts a burst from one client.

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryIncr(key: string, windowSec: number): number {
  const now = Date.now();
  const hit = memory.get(key);
  if (!hit || hit.resetAt <= now) {
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return 1;
  }
  hit.count += 1;
  return hit.count;
}

async function redisIncr(key: string, windowSec: number): Promise<number | null> {
  // The Vercel Marketplace integration names these KV_REST_API_*; a
  // direct Upstash setup names them UPSTASH_REDIS_REST_*. Either works.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
      ]),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown }[];
    return typeof data?.[0]?.result === 'number' ? data[0].result : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Counts one hit against key; true while the count is within limit. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const count = (await redisIncr(bucket, windowSec)) ?? memoryIncr(bucket, windowSec);
  return count <= limit;
}

// Keys never hold a raw IP or email address.
export function hashKey(value: string): string {
  return createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 32);
}

/** Per-client limit for a named route bucket. */
export function limitRequest(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  return rateLimit(`${bucket}:${hashKey(clientIp(req.headers))}`, limit, windowSec);
}

/** The public form routes: a short burst limit plus a daily ceiling. */
export async function limitFormRequest(req: NextRequest, bucket: string): Promise<boolean> {
  const burst = await limitRequest(req, `${bucket}:10m`, 5, 600);
  const daily = await limitRequest(req, `${bucket}:1d`, 20, 86_400);
  return burst && daily;
}

export function resetMemoryLimiter(): void {
  memory.clear();
}
