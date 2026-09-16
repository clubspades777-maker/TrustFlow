import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { scoreDonation, shouldHoldDonation } from '../../shared/risk.ts';

// Processes a donation with server-side fraud analysis.
// Holds suspicious funds for manual admin review instead of auto-releasing.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { recipient_type, recipient_id, amount, donor_name, donor_email, message, payment_instrument, device_fingerprint } = body;

    if (!recipient_id || !amount || amount <= 0) {
      return Response.json({ error: 'Invalid donation payload' }, { status: 400 });
    }

    // Fetch recipient (NGO or Fundraiser) via service role for risk context
    const recipient = recipient_type === 'ngo'
      ? await base44.asServiceRole.entities.NGO.get(recipient_id)
      : await base44.asServiceRole.entities.Fundraiser.get(recipient_id);

    if (!recipient) return Response.json({ error: 'Recipient not found' }, { status: 404 });
    if (recipient_type === 'ngo' && recipient.status !== 'verified') {
      return Response.json({ error: 'Recipient is not verified to receive donations' }, { status: 403 });
    }

    // Gather recent donations to this recipient for velocity/cluster analysis
    const recent = await base44.asServiceRole.entities.Donation.filter(
      { recipient_id },
      '-created_date',
      200
    );
    const recentByInstrument = payment_instrument
      ? recent.filter((d) => d.payment_instrument === payment_instrument)
      : [];
    const recentByFingerprint = device_fingerprint
      ? recent.filter((d) => d.device_fingerprint === device_fingerprint)
      : [];

    const { score, flags } = scoreDonation({
      amount,
      donationsToRecipient: recent,
      recentByInstrument,
      recentByFingerprint,
      recipient
    });

    const held = shouldHoldDonation(score);
    const status = held ? 'held_for_review' : 'completed';

    const donation = await base44.asServiceRole.entities.Donation.create({
      donor_name: donor_name || (user && user.full_name) || 'Anonymous',
      donor_email: donor_email || (user && user.email) || '',
      recipient_type,
      recipient_id,
      recipient_name: recipient.name || recipient.title,
      amount,
      message: message || '',
      status,
      payment_instrument: payment_instrument || 'upi',
      donor_ip: 'recorded',
      device_fingerprint: device_fingerprint || 'unknown',
      fraud_flags: flags,
      risk_score: score,
      held_reason: held ? flags.join('; ') : ''
    });

    // If held, create a review flag for admins
    if (held) {
      await base44.asServiceRole.entities.ReviewFlag.create({
        flag_type: 'donation_anomaly',
        entity_type: 'Donation',
        entity_id: donation.id,
        entity_name: `${donation.donor_name} → ${donation.recipient_name} ₹${amount}`,
        reason: `Donation held: risk score ${score}`,
        details: flags.join('; '),
        severity: score >= 70 ? 'critical' : score >= 55 ? 'high' : 'medium',
        status: 'open'
      });
    } else {
      // Release funds: increment recipient raised total
      if (recipient_type === 'ngo') {
        await base44.asServiceRole.entities.NGO.update(recipient_id, {
          total_raised: (recipient.total_raised || 0) + amount
        });
      } else {
        await base44.asServiceRole.entities.Fundraiser.update(recipient_id, {
          raised_amount: (recipient.raised_amount || 0) + amount
        });
      }
    }

    return Response.json({
      donation_id: donation.id,
      status,
      risk_score: score,
      fraud_flags: flags,
      held
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}