import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Branded OG fallback for titles without a cover (spec 6.3): title name,
// publisher and niche on a brand background, so OG images always resolve.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')?.slice(0, 120) ?? 'Neesh Directory';
  const sub = req.nextUrl.searchParams.get('sub')?.slice(0, 160) ?? '';
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f1f0f9',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 96, height: 10, background: '#7d3abf', marginBottom: 48 }} />
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: '#000',
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {sub ? (
            <div style={{ fontSize: 34, color: '#71747f', marginTop: 28 }}>{sub}</div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 30,
          }}
        >
          <div style={{ fontWeight: 800, color: '#000' }}>Neesh</div>
          <div style={{ color: '#71747f' }}>Independent print, indexed</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
