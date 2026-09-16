// Client-side suspicious-activity and spike analytics.
// Thresholds mirror base44/shared/risk.ts so detection stays consistent between
// the backend functions and this dashboard. Kept as a local copy because the
// shared module is server-side only and not part of the client bundle.

export const VELOCITY_WINDOW_MINUTES = 20;
export const VELOCITY_COUNT_THRESHOLD = 50;
export const SPIKE_MULTIPLIER = 20;

const VEL_WINDOW_MS = VELOCITY_WINDOW_MINUTES * 60 * 1000;

// Group donations by a shared device fingerprint reused across multiple donors.
export function groupByDeviceFingerprint(donations) {
  const groups = {};
  for (const d of donations) {
    const fp = d.device_fingerprint;
    if (!fp) continue;
    if (!groups[fp]) groups[fp] = [];
    groups[fp].push(d);
  }
  return Object.values(groups)
    .map((items) => {
      const donors = new Set(items.map((d) => d.donor_email || d.donor_name));
      return {
        type: "device",
        key: items[0].device_fingerprint,
        donations: items,
        donorCount: donors.size,
        recipientCount: new Set(items.map((d) => d.recipient_id)).size,
        totalAmount: items.reduce((s, d) => s + (d.amount || 0), 0),
        severity: donors.size >= 8 ? "critical" : donors.size >= 5 ? "high" : "medium",
      };
    })
    .filter((g) => g.donorCount >= 2)
    .sort((a, b) => b.donorCount - a.donorCount);
}

// Group donations by a payment instrument reused across many donations to one recipient.
export function groupByPaymentInstrument(donations) {
  const groups = {};
  for (const d of donations) {
    const inst = d.payment_instrument;
    if (!inst) continue;
    if (!groups[inst]) groups[inst] = [];
    groups[inst].push(d);
  }
  return Object.values(groups)
    .map((items) => {
      const donors = new Set(items.map((d) => d.donor_email || d.donor_name));
      return {
        type: "instrument",
        key: items[0].payment_instrument,
        donations: items,
        donorCount: donors.size,
        recipientCount: new Set(items.map((d) => d.recipient_id)).size,
        totalAmount: items.reduce((s, d) => s + (d.amount || 0), 0),
        severity: items.length >= 10 ? "high" : "medium",
      };
    })
    .filter((g) => g.donations.length >= 5)
    .sort((a, b) => b.donations.length - a.donations.length);
}

// Velocity bursts: many donations to the same recipient inside the velocity window.
export function detectVelocityBursts(donations) {
  const byRecipient = {};
  const now = Date.now();
  const windowStart = now - VEL_WINDOW_MS;
  for (const d of donations) {
    if (new Date(d.created_date).getTime() < windowStart) continue;
    if (!byRecipient[d.recipient_id]) byRecipient[d.recipient_id] = { recipient_id: d.recipient_id, recipient_name: d.recipient_name, items: [] };
    byRecipient[d.recipient_id].items.push(d);
  }
  return Object.values(byRecipient)
    .filter((g) => g.items.length >= VELOCITY_COUNT_THRESHOLD)
    .map((g) => ({
      type: "velocity",
      key: g.recipient_name,
      recipient_id: g.recipient_id,
      recipient_name: g.recipient_name,
      donations: g.items,
      count: g.items.length,
      totalAmount: g.items.reduce((s, d) => s + (d.amount || 0), 0),
      severity: g.items.length >= VELOCITY_COUNT_THRESHOLD * 1.5 ? "critical" : "high",
    }))
    .sort((a, b) => b.count - a.count);
}

// Rank recipients whose recent inflow far exceeds their historical monthly average.
export function rankSpikeRecipients(donations, recentWindowDays = 2, historyDays = 30) {
  const byRecipient = {};
  const now = Date.now();
  const recentStart = now - recentWindowDays * 24 * 60 * 60 * 1000;
  const historyStart = now - historyDays * 24 * 60 * 60 * 1000;
  for (const d of donations) {
    const t = new Date(d.created_date).getTime();
    if (!byRecipient[d.recipient_id]) byRecipient[d.recipient_id] = { recipient_id: d.recipient_id, recipient_name: d.recipient_name, recent: 0, historical: 0, donations: [] };
    byRecipient[d.recipient_id].donations.push(d);
    if (t >= recentStart) byRecipient[d.recipient_id].recent += d.amount || 0;
    else if (t >= historyStart) byRecipient[d.recipient_id].historical += d.amount || 0;
  }
  const historyMonths = historyDays / 30;
  return Object.values(byRecipient)
    .map((r) => {
      const avg = r.historical / Math.max(historyMonths, 0.1);
      const multiplier = avg > 0 ? r.recent / avg : r.recent > 0 ? Infinity : 0;
      return { ...r, monthlyAvg: avg, multiplier };
    })
    .filter((r) => r.recent > 0 && r.multiplier >= SPIKE_MULTIPLIER)
    .sort((a, b) => b.multiplier - a.multiplier);
}

// Build a per-day time series of donation volume per recipient for the last `days` days.
export function donationTimeSeries(donations, days = 30) {
  const byRecipient = {};
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  for (const d of donations) {
    const dt = new Date(d.created_date);
    if (dt < start) continue;
    const day = dt.toISOString().slice(0, 10);
    if (!byRecipient[d.recipient_id]) byRecipient[d.recipient_id] = { recipient_id: d.recipient_id, recipient_name: d.recipient_name, byDay: {} };
    byRecipient[d.recipient_id].byDay[day] = (byRecipient[d.recipient_id].byDay[day] || 0) + (d.amount || 0);
  }

  const daysList = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    daysList.push(dt.toISOString().slice(0, 10));
  }
  return { byRecipient, days: daysList };
}