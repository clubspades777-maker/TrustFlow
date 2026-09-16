import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { scoreWithdrawal } from '../../shared/risk.ts';

// Creates a withdrawal request. Large or spike-flagged requests are forced
// into pending status for manual admin review (never auto-released).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'ngo') {
      // In practice only the NGO's authorized rep should request; gate admin approval separately
    }

    const body = await req.json();
    const { ngo_id, amount, purpose } = body;
    if (!ngo_id || !amount || amount <= 0) {
      return Response.json({ error: 'Invalid withdrawal payload' }, { status: 400 });
    }

    const ngo = await base44.asServiceRole.entities.NGO.get(ngo_id);
    if (!ngo) return Response.json({ error: 'NGO not found' }, { status: 404 });

    // Historical monthly average: total_raised spread over months since verified_date / created_date
    const since = ngo.verified_date || ngo.created_date;
    const monthsActive = since
      ? Math.max(1, Math.ceil((Date.now() - new Date(since).getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 1;
    const historicalMonthly = (ngo.total_raised || 0) / monthsActive;

    const recentDonations = await base44.asServiceRole.entities.Donation.filter(
      { recipient_id: ngo_id, recipient_type: 'ngo' },
      '-created_date',
      300
    );
    const recentDonationsTotal = recentDonations.reduce((s, d) => s + (d.amount || 0), 0);

    const { score, flags, largeFlag, spikeFlag, needsReview } = scoreWithdrawal({
      amount,
      ngoHistoricalMonthly: historicalMonthly,
      recentDonationsTotal,
      recentDonations
    });

    const status = needsReview ? 'pending' : 'pending'; // always pending; review function decides auto-approve eligibility
    const withdrawal = await base44.asServiceRole.entities.WithdrawalRequest.create({
      ngo_id,
      ngo_name: ngo.name,
      amount,
      purpose: purpose || '',
      status,
      large_flag: largeFlag,
      spike_flag: spikeFlag
    });

    if (needsReview) {
      await base44.asServiceRole.entities.ReviewFlag.create({
        flag_type: spikeFlag ? 'withdrawal_spike' : 'withdrawal_large',
        entity_type: 'WithdrawalRequest',
        entity_id: withdrawal.id,
        entity_name: `${ngo.name} ₹${amount}`,
        reason: `Withdrawal needs review: risk score ${score}`,
        details: flags.join('; '),
        severity: score >= 70 ? 'critical' : score >= 55 ? 'high' : 'medium',
        status: 'open'
      });
    }

    return Response.json({
      withdrawal_id: withdrawal.id,
      needs_review: needsReview,
      risk_score: score,
      flags,
      large_flag: largeFlag,
      spike_flag: spikeFlag
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}