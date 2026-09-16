// Shared risk-scoring logic for donation & withdrawal fraud detection.
// Used by backend functions so the rules live server-side only.

export const LARGE_DONATION_THRESHOLD = 100000; // ₹1,00,000 single donation triggers review
export const LARGE_WITHDRAWAL_THRESHOLD = 500000; // ₹5,00,000 withdrawal triggers review
export const VELOCITY_WINDOW_MINUTES = 20;
export const VELOCITY_COUNT_THRESHOLD = 50; // many donors to same NGO in short window
export const SPIKE_MULTIPLIER = 20; // 20x normal monthly avg = spike

// Compute a risk score (0-100) and list of fraud flags for a new donation.
export function scoreDonation({ amount, donationsToRecipient, recentByInstrument, recentByFingerprint, recipient }) {
  const flags = [];
  let score = 0;

  if (amount >= LARGE_DONATION_THRESHOLD) {
    flags.push(`large_single_donation:${amount}`);
    score += 35;
  }

  // Velocity: many donations to the same recipient in a short window
  const now = Date.now();
  const windowStart = now - VELOCITY_WINDOW_MINUTES * 60 * 1000;
  const recentCount = donationsToRecipient.filter(
    (d) => new Date(d.created_date).getTime() >= windowStart
  ).length;
  if (recentCount >= VELOCITY_COUNT_THRESHOLD) {
    flags.push(`velocity_burst:${recentCount}_in_${VELOCITY_WINDOW_MINUTES}m`);
    score += 40;
  }

  // Same payment instrument used across many donations to this recipient
  const instrumentCount = recentByInstrument.length;
  if (instrumentCount >= 10) {
    flags.push(`instrument_reuse:${instrumentCount}`);
    score += 20;
  }

  // Same device fingerprint across multiple donors
  const deviceCount = recentByFingerprint.length;
  if (deviceCount >= 5) {
    flags.push(`device_overlap:${deviceCount}`);
    score += 25;
  }

  // Amount clustering near a suspicious round number (e.g. 9000) repeated
  const cluster = donationsToRecipient.filter(
    (d) => Math.abs(d.amount - amount) < 500
  ).length;
  if (cluster >= 20) {
    flags.push(`amount_clustering:${cluster}`);
    score += 15;
  }

  // Unverified recipient receiving funds
  if (recipient && recipient.status && recipient.status !== "verified") {
    flags.push(`recipient_unverified:${recipient.status}`);
    score += 30;
  }

  return { score: Math.min(100, score), flags };
}

// Decide whether a withdrawal request needs manual review.
export function scoreWithdrawal({ amount, ngoHistoricalMonthly, recentDonationsTotal, recentDonations }) {
  const flags = [];
  let score = 0;
  let largeFlag = false;
  let spikeFlag = false;

  if (amount >= LARGE_WITHDRAWAL_THRESHOLD) {
    largeFlag = true;
    flags.push(`large_withdrawal:${amount}`);
    score += 30;
  }

  // Spike: recent inflow far exceeds historical monthly average
  const avg = ngoHistoricalMonthly || 0;
  if (avg > 0 && recentDonationsTotal >= avg * SPIKE_MULTIPLIER) {
    spikeFlag = true;
    flags.push(`inflow_spike:${recentDonationsTotal}_vs_avg_${avg}`);
    score += 45;
  }

  // Sudden inflow followed quickly by a withdrawal attempt
  const recentWindow = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const inflowInLast2d = recentDonations.filter(
    (d) => new Date(d.created_date).getTime() >= recentWindow
  ).reduce((s, d) => s + d.amount, 0);
  if (inflowInLast2d > 0 && amount >= inflowInLast2d * 0.8) {
    flags.push(`rapid_outflow_after_inflow`);
    score += 25;
  }

  return { score: Math.min(100, score), flags, largeFlag, spikeFlag, needsReview: score >= 40 };
}

export function shouldHoldDonation(score) {
  return score >= 40;
}