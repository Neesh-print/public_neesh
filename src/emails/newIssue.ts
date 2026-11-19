// New-issue email, from the design handoff: 600px, white; wordmark left and
// "A MAGAZINE YOU FOLLOW" right over a 1px rule; a 180px cover beside an
// accent eyebrow, an Archivo headline, a line about what the reader owns,
// and one black pill to the title page's shops; a footer with one-tap
// unfollow and email settings. Sender Neesh.

export interface NewIssueBlock {
  titleName: string;
  issueLabel: string;
  dateLabel: string | null;
  coverUrl: string | null;
  owned: number;
  total: number;
  shopsUrl: string;
  unfollowUrl: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MONO = "'IBM Plex Mono',ui-monospace,Menlo,monospace";
const DISPLAY = 'Archivo,Helvetica,Arial,sans-serif';
const BODY = 'Manrope,Helvetica,Arial,sans-serif';

function ownedLine(b: NewIssueBlock): string {
  if (b.owned === 0) return `You follow ${b.titleName} on Neesh.`;
  return `You own ${b.owned} of its ${b.total} issues.`;
}

function block(b: NewIssueBlock): string {
  const eyebrow = ['New issue', b.dateLabel].filter(Boolean).join(' · ');
  const cover = b.coverUrl
    ? `<img src="${esc(b.coverUrl)}" width="180" alt="${esc(`${b.titleName}, ${b.issueLabel}`)}" style="display:block;width:180px;height:auto;border-radius:3px">`
    : `<div style="width:180px;height:240px;background:#efeef6;border-radius:3px"></div>`;
  return `
  <tr><td style="padding:32px 0;border-bottom:1px solid #000">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="180" valign="top" style="padding-right:28px">${cover}</td>
      <td valign="top">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7d3bbf">${esc(eyebrow)}</div>
        <div style="font-family:${DISPLAY};font-weight:600;font-size:34px;line-height:0.95;letter-spacing:-0.035em;color:#000;margin:12px 0 14px">${esc(b.titleName)} has a new issue.</div>
        <p style="font-family:${BODY};font-size:16px;line-height:1.5;color:#2a2c33;margin:0 0 22px">${esc(b.issueLabel)} is out. ${esc(ownedLine(b))} Save it to your collection, or see the shops that carry it.</p>
        <a href="${esc(b.shopsUrl)}" style="display:inline-block;background:#000;color:#fff;font-family:${BODY};font-weight:600;font-size:15px;text-decoration:none;padding:14px 22px;border-radius:999px">Find shops</a>
        <div style="font-family:${MONO};font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#71747f;margin-top:22px">
          You follow ${esc(b.titleName)} on Neesh · <a href="${esc(b.unfollowUrl)}" style="color:#71747f">Unfollow</a>
        </div>
      </td>
    </tr></table>
  </td></tr>`;
}

export function newIssueEmail(
  blocks: NewIssueBlock[],
  urls: { logo: string; settings: string }
): { subject: string; html: string; text: string } {
  const html = `<!doctype html><html><body style="margin:0;background:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="padding-bottom:16px;border-bottom:1px solid #000">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><img src="${esc(urls.logo)}" width="88" alt="Neesh" style="display:block"></td>
      <td align="right" style="font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#000">A magazine you follow</td>
    </tr></table>
  </td></tr>
  ${blocks.map(block).join('')}
  <tr><td style="padding-top:18px;font-family:${MONO};font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#71747f">
    <a href="${esc(urls.settings)}" style="color:#71747f">Email settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text =
    blocks
      .map(
        (b) =>
          `${b.titleName} has a new issue. ${b.issueLabel} is out. ${ownedLine(b)}\n` +
          `Find shops: ${b.shopsUrl}\nUnfollow: ${b.unfollowUrl}`
      )
      .join('\n\n') + `\n\nEmail settings: ${urls.settings}`;

  return { subject: 'A magazine you follow has a new issue', html, text };
}
