import { NextRequest } from 'next/server';
import { z } from 'zod';
import { limitRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const reportSchema = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional(),
  path: z.string().max(500).optional(),
  boundary: z.enum(['page', 'global']),
});

// Browser-side error reports from app/error.tsx and app/global-error.tsx,
// logged (and alerted) like server errors. Small, rate limited, and always
// 204 so a broken page never retries in a loop.
export async function POST(req: NextRequest) {
  if (!(await limitRequest(req, 'client-error', 10, 60))) {
    return new Response(null, { status: 204 });
  }
  try {
    const text = await req.text();
    if (text.length > 4000) return new Response(null, { status: 204 });
    const parsed = reportSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      log('error', 'client.render_error', {
        ...parsed.data,
        userAgent: req.headers.get('user-agent')?.slice(0, 200),
      });
    }
  } catch {
    // malformed report: ignore
  }
  return new Response(null, { status: 204 });
}
