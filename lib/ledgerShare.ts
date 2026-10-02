export type ShareLedgerItem = {
  name: string;
  quantity: number;
  rate: number;
  saleType?: string;
};

export type ShareLedgerEntry = {
  type: 'sale' | 'payment';
  amount: number;
  paymentMethod?: 'cash' | 'online' | null;
  items: ShareLedgerItem[];
  note?: string;
  parchiImage?: string;
  date: string;
  balanceAfter: number;
};

export type ShareCustomer = {
  name: string;
  phone?: string;
  balance: number;
};

const SHOP_NAME = 'Bhagwati';

function inr(n: number) {
  return `₹${(n || 0).toLocaleString('en-IN')}`;
}

function shortDate(d: string | Date) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

function entryTitle(e: ShareLedgerEntry) {
  return e.type === 'sale'
    ? 'Credit sale'
    : `Payment (${e.paymentMethod === 'online' ? 'Online' : 'Cash'})`;
}

function itemLine(it: ShareLedgerItem) {
  return `${it.name} × ${it.quantity} @ ${inr(it.rate)}${it.saleType ? ` (${it.saleType})` : ''}`;
}

/** Oldest first, so the statement reads top to bottom */
function chronological(entries: ShareLedgerEntry[]) {
  return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function whatsappNumber(phone?: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function buildLedgerText(customer: ShareCustomer, entries: ShareLedgerEntry[]) {
  const lines: string[] = [];
  lines.push(`*${SHOP_NAME} — Ledger Statement*`);
  lines.push(`Customer: *${customer.name}*`);
  if (customer.phone) lines.push(`Phone: ${customer.phone}`);
  lines.push(`Date: ${shortDate(new Date())}`);
  lines.push('');

  const rows = chronological(entries);
  if (rows.length === 0) lines.push('_No entries yet_');

  rows.forEach((e, i) => {
    const sign = e.type === 'sale' ? '+' : '−';
    lines.push(`*${i + 1}. ${shortDate(e.date)} — ${entryTitle(e)}*  ${sign}${inr(e.amount)}`);
    e.items?.forEach((it) => lines.push(`   • ${itemLine(it)}`));
    if (e.note) lines.push(`   📝 ${e.note}`);
    if (e.parchiImage) lines.push(`   📷 Parchi: ${e.parchiImage}`);
    lines.push(`   Balance: ${inr(e.balanceAfter)}`);
    lines.push('');
  });

  lines.push(`*Current due: ${inr(customer.balance)}*`);
  lines.push('');
  lines.push(`Thank you — ${SHOP_NAME}`);
  return lines.join('\n');
}

export function whatsappUrl(phone: string | undefined, text: string) {
  const num = whatsappNumber(phone);
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

/** Draws the ledger as a statement-style PNG */
export async function renderLedgerImage(
  customer: ShareCustomer,
  entries: ShareLedgerEntry[]
): Promise<Blob> {
  const W = 1080;
  const PAD = 56;
  const FONT = '"Segoe UI", Roboto, Arial, sans-serif';
  const rows = chronological(entries);

  const measure = document.createElement('canvas').getContext('2d')!;
  const colDate = PAD;
  const colDetails = PAD + 190;
  const detailsWidth = 470;
  const colAmount = W - PAD - 190;
  const colBalance = W - PAD;

  measure.font = `26px ${FONT}`;
  const rowLayouts = rows.map((e) => {
    const detail: string[] = [entryTitle(e)];
    e.items?.forEach((it) => detail.push(itemLine(it)));
    if (e.note) detail.push(e.note);
    if (e.parchiImage) detail.push('📷 Parchi attached');
    const wrapped = detail.flatMap((d) => wrap(measure, d, detailsWidth));
    return { e, wrapped, height: Math.max(80, wrapped.length * 36 + 32) };
  });

  const headerH = 330;
  const tableHeadH = 64;
  const footerH = 170;
  const bodyH = rowLayouts.reduce((s, r) => s + r.height, 0) || 100;
  const H = headerH + tableHeadH + bodyH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Header band
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText(SHOP_NAME, PAD, 80);
  ctx.font = `26px ${FONT}`;
  ctx.fillText('Ledger Statement', PAD, 122);
  ctx.textAlign = 'right';
  ctx.fillText(shortDate(new Date()), W - PAD, 122);
  ctx.textAlign = 'left';

  // Customer + balance
  ctx.fillStyle = '#111827';
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText(customer.name, PAD, 215);
  ctx.fillStyle = '#6b7280';
  ctx.font = `26px ${FONT}`;
  ctx.fillText(customer.phone || '', PAD, 255);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#6b7280';
  ctx.font = `22px ${FONT}`;
  ctx.fillText('CURRENT DUE', W - PAD, 205);
  ctx.fillStyle = customer.balance > 0 ? '#b45309' : '#15803d';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(inr(customer.balance), W - PAD, 258);
  ctx.textAlign = 'left';

  // Table head
  let y = headerH;
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(PAD - 16, y, W - 2 * PAD + 32, tableHeadH);
  ctx.fillStyle = '#374151';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('Date', colDate, y + 41);
  ctx.fillText('Details', colDetails, y + 41);
  ctx.textAlign = 'right';
  ctx.fillText('Amount', colAmount, y + 41);
  ctx.fillText('Balance', colBalance, y + 41);
  ctx.textAlign = 'left';
  y += tableHeadH;

  if (rowLayouts.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = `26px ${FONT}`;
    ctx.fillText('No entries yet', colDetails, y + 60);
  }

  for (const { e, wrapped, height } of rowLayouts) {
    const top = y + 44;
    ctx.fillStyle = '#4b5563';
    ctx.font = `24px ${FONT}`;
    ctx.fillText(shortDate(e.date), colDate, top);

    wrapped.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? (e.type === 'sale' ? '#b45309' : '#15803d') : '#111827';
      ctx.font = i === 0 ? `bold 26px ${FONT}` : `26px ${FONT}`;
      ctx.fillText(line, colDetails, top + i * 36);
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = e.type === 'sale' ? '#b45309' : '#15803d';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`${e.type === 'sale' ? '+' : '−'}${inr(e.amount)}`, colAmount, top);
    ctx.fillStyle = '#111827';
    ctx.font = `26px ${FONT}`;
    ctx.fillText(inr(e.balanceAfter), colBalance, top);
    ctx.textAlign = 'left';

    y += height;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD - 16, y);
    ctx.lineTo(W - PAD + 16, y);
    ctx.stroke();
  }

  // Footer total
  y += 70;
  ctx.fillStyle = '#111827';
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText('Total due', PAD, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = customer.balance > 0 ? '#b45309' : '#15803d';
  ctx.fillText(inr(customer.balance), W - PAD, y);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = `22px ${FONT}`;
  ctx.fillText(`Thank you — ${SHOP_NAME}`, W / 2, y + 60);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image failed'))), 'image/png')
  );
}

async function fetchAsFile(url: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'customer';
}

export async function buildShareFiles(
  customer: ShareCustomer,
  entries: ShareLedgerEntry[],
  includeParchi: boolean
): Promise<File[]> {
  const base = safeName(customer.name);
  const ledgerBlob = await renderLedgerImage(customer, entries);
  const files: File[] = [new File([ledgerBlob], `${base}_ledger.png`, { type: 'image/png' })];

  if (includeParchi) {
    const withParchi = chronological(entries).filter((e) => e.parchiImage);
    const parchi = await Promise.all(
      withParchi.map((e, i) =>
        fetchAsFile(e.parchiImage!, `${base}_parchi_${i + 1}_${shortDate(e.date).replace(/\s/g, '-')}`)
      )
    );
    parchi.forEach((f) => f && files.push(f));
  }
  return files;
}

export function canShareFiles(files: File[]) {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files })
  );
}

export function downloadFiles(files: File[]) {
  files.forEach((f, i) => {
    setTimeout(() => {
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, i * 300);
  });
}
