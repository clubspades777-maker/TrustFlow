import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Lock, HandCoins, AlertTriangle, Flag, TrendingUp, ShieldAlert, ArrowLeft } from "lucide-react";
import FlaggedDonationsTab from "@/components/risk/FlaggedDonationsTab";
import SuspiciousActivityTab from "@/components/risk/SuspiciousActivityTab";
import DonationSpikesTab from "@/components/risk/DonationSpikesTab";
import HighRiskWithdrawalsTab from "@/components/risk/HighRiskWithdrawalsTab";
import { groupByDeviceFingerprint, groupByPaymentInstrument, detectVelocityBursts } from "@/lib/riskAnalytics";

const TABS = [
  { id: "flagged", label: "Flagged Donations", icon: Lock },
  { id: "activity", label: "Suspicious Activity", icon: Activity },
  { id: "spikes", label: "Donation Spikes", icon: TrendingUp },
  { id: "withdrawals", label: "High-Risk Withdrawals", icon: HandCoins },
];

export default function RiskDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("flagged");
  const [allDonations, setAllDonations] = useState([]);
  const [flaggedDonations, setFlaggedDonations] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  const load = () => {
    Promise.all([
      base44.entities.Donation.list("-created_date", 500),
      base44.entities.WithdrawalRequest.filter({ status: "pending" }, "-created_date", 100),
      base44.entities.ReviewFlag.filter({ status: "open" }, "-created_date", 100),
    ]).then(([d, w, f]) => {
      setAllDonations(d);
      setFlaggedDonations(d.filter((x) => x.status === "held_for_review" || x.status === "flagged"));
      setWithdrawals(w.filter((x) => x.large_flag || x.spike_flag));
      setFlags(f);
      setLoading(false);
    });
  };

  useEffect(() => {
    base44.auth.me().then((u) => setUser(u)).catch(() => {});
    load();
  }, []);

  const isAdmin = user?.role === "admin";

  const releaseDonation = async (d) => {
    setBusy(true);
    try {
      await base44.entities.Donation.update(d.id, { status: "released" });
      const ngo = await base44.entities.NGO.get(d.recipient_id);
      await base44.entities.NGO.update(d.recipient_id, { total_raised: (ngo.total_raised || 0) + d.amount });
      const fl = flags.find((f) => f.entity_id === d.id);
      if (fl) await base44.entities.ReviewFlag.update(fl.id, { status: "resolved", resolution_notes: "Released by admin" });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const refundDonation = async (d) => {
    setBusy(true);
    try {
      await base44.entities.Donation.update(d.id, { status: "refunded" });
      const fl = flags.find((f) => f.entity_id === d.id);
      if (fl) await base44.entities.ReviewFlag.update(fl.id, { status: "resolved", resolution_notes: "Refunded" });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const flagDonation = async (d) => {
    setBusy(true);
    try {
      await base44.entities.Donation.update(d.id, { status: "flagged" });
      await base44.entities.ReviewFlag.create({
        flag_type: "donation_anomaly",
        entity_type: "Donation",
        entity_id: d.id,
        entity_name: `${d.donor_name} → ${d.recipient_name}`,
        reason: "Manually flagged from Risk Dashboard",
        details: (d.fraud_flags || []).join("; ") || `risk score ${d.risk_score}`,
        severity: "high",
        status: "open",
      });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  // Flag an entire suspicious cluster (device/instrument/velocity).
  const flagCluster = async (g) => {
    setBusy(true);
    try {
      const label = g.type === "device" ? `Device ${g.key.slice(0, 8)}` : g.type === "instrument" ? `Instrument ${g.key.slice(0, 8)}` : `Velocity → ${g.recipient_name}`;
      await base44.entities.ReviewFlag.create({
        flag_type: "donation_anomaly",
        entity_type: "DonationCluster",
        entity_id: g.key,
        entity_name: label,
        reason: `Suspicious ${g.type} cluster: ${g.donorCount} donors, ₹${g.totalAmount.toLocaleString("en-IN")}`,
        details: (g.donations[0]?.fraud_flags || []).join("; "),
        severity: g.severity === "critical" ? "critical" : "high",
        status: "open",
      });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const approveWithdrawal = async (w, adminNotes) => {
    setBusy(true);
    try {
      await base44.entities.WithdrawalRequest.update(w.id, { status: "approved", admin_notes: adminNotes, reviewed_by: user?.email, reviewed_date: new Date().toISOString() });
      const ngo = await base44.entities.NGO.get(w.ngo_id);
      await base44.entities.NGO.update(w.ngo_id, { total_utilized: (ngo.total_utilized || 0) + w.amount });
      const fl = flags.find((f) => f.entity_id === w.id);
      if (fl) await base44.entities.ReviewFlag.update(fl.id, { status: "resolved", resolution_notes: "Approved" });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const rejectWithdrawal = async (w, adminNotes) => {
    setBusy(true);
    try {
      await base44.entities.WithdrawalRequest.update(w.id, { status: "rejected", admin_notes: adminNotes, reviewed_by: user?.email, reviewed_date: new Date().toISOString() });
      const fl = flags.find((f) => f.entity_id === w.id);
      if (fl) await base44.entities.ReviewFlag.update(fl.id, { status: "resolved", resolution_notes: "Rejected" });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  if (user && !isAdmin) {
    return <div className="p-10 text-center text-red-600">Admin access required to view the risk & suspicious activity dashboard.</div>;
  }

  // Summary counts
  const deviceClusters = groupByDeviceFingerprint(allDonations).length;
  const instrumentClusters = groupByPaymentInstrument(allDonations).length;
  const velocityClusters = detectVelocityBursts(allDonations).length;

  const summary = [
    { label: "Held / Flagged donations", value: flaggedDonations.length, icon: Lock, tone: "amber" },
    { label: "Suspicious clusters", value: deviceClusters + instrumentClusters + velocityClusters, icon: Activity, tone: "red" },
    { label: "High-risk withdrawals", value: withdrawals.length, icon: HandCoins, tone: "amber" },
    { label: "Open review flags", value: flags.length, icon: Flag, tone: "emerald" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-emerald-600" /> Risk & Suspicious Activity</h1>
          <p className="text-sm text-emerald-700 mt-1">Flagged donations, suspicious account clusters, donation spikes, and high-risk withdrawals.</p>
        </div>
        <Link to="/admin"><Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"><ArrowLeft className="w-4 h-4 mr-1" /> Risk Review</Button></Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {summary.map((s) => {
          const Icon = s.icon;
          const tone = s.tone === "red" ? "border-red-200 bg-red-50/40 text-red-700" : s.tone === "amber" ? "border-amber-200 bg-amber-50/40 text-amber-700" : "border-emerald-200 bg-emerald-50/40 text-emerald-700";
          return (
            <Card key={s.label} className={`p-4 border ${tone}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{s.value}</span>
                <Icon className="w-5 h-5 opacity-70" />
              </div>
              <div className="text-xs mt-1 font-medium">{s.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-6 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${active ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-emerald-600 mt-6">Loading…</div>
      ) : (
        <div className="mt-6">
          {tab === "flagged" && <FlaggedDonationsTab donations={flaggedDonations} onRelease={releaseDonation} onRefund={refundDonation} onFlag={flagDonation} busy={busy} />}
          {tab === "activity" && <SuspiciousActivityTab donations={allDonations} onFlag={flagCluster} busy={busy} />}
          {tab === "spikes" && <DonationSpikesTab donations={allDonations} onSelectRecipient={setSelectedRecipient} />}
          {tab === "withdrawals" && <HighRiskWithdrawalsTab withdrawals={withdrawals} donations={allDonations} onApprove={approveWithdrawal} onReject={rejectWithdrawal} busy={busy} />}
        </div>
      )}

      {selectedRecipient && (
        <RecipientDonationDrilldown recipient={selectedRecipient} onClose={() => setSelectedRecipient(null)} />
      )}
    </div>
  );
}

// Drilldown panel showing the anomalous donations for a selected spike recipient.
function RecipientDonationDrilldown({ recipient, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30" onClick={onClose}>
      <Card className="w-full md:max-w-lg m-0 md:m-4 p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-900">{recipient.recipient_name}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          ₹{recipient.recent.toLocaleString("en-IN")} in last 48h · {recipient.multiplier === Infinity ? "∞" : `${recipient.multiplier.toFixed(0)}×`} monthly average
        </p>
        <div className="space-y-1">
          {recipient.donations.slice(0, 30).map((d) => (
            <div key={d.id} className="text-xs flex justify-between gap-2 border-b border-emerald-50 py-1.5">
              <div>
                <div className="text-green-900 font-medium">{d.donor_name}</div>
                <div className="text-gray-400">{new Date(d.created_date).toLocaleString("en-IN")}</div>
              </div>
              <div className="text-emerald-700 font-medium flex-shrink-0">₹{d.amount.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}