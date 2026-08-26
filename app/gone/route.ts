// Target of the middleware rewrite for removed or excluded profiles.
// 410 Gone rather than 404 tells crawlers to drop the page (spec 6.3).
export const dynamic = 'force-dynamic';

export async function GET() {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Removed | Neesh</title></head>
<body style="font-family:Inter,system-ui,sans-serif;color:#000;padding:4rem 1.5rem;max-width:36rem;margin:0 auto">
<h1 style="font-size:1.5rem">This page has been removed</h1>
<p style="color:#71747f">The profile that lived here is no longer part of the Neesh directory.</p>
<p><a href="/index" style="color:#7d3abf">Browse the directory</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
