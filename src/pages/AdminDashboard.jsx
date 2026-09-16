import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VerificationBadge from "@/components/VerificationBadge";
import { ShieldCheck, AlertTriangle, HandCoins, Lock, Unlock, CheckCircle2, XCircle, FileCheck, Loader2, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("verifications");
  const [ngos, setNgos] = useState([]);
  const [flags, setFlags] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [heldDonations, setHeldDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.NGO.filter({ status: "pending_verification" }, "created_date", 50),
      base44.entities.ReviewFlag.filter({ status: "open" }, "-created_date", 50),
      base44.entities.WithdrawalRequest.filter({ status: "pending" }, "-created_date", 50),
      base44.entities.Donation.filter({ status: "held_for_review" }, "-created_date", 50),
    ]).then(([n, f, w, d]) => { setNgos(n); setFlags(f); setWithdrawals(w); setHeldDonations(d); setLoading(false); });
  };

  useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); }).catch(() => {});
    load();
  }, []);

  const isAdmin = user?.role === "admin";

  const verifyNGO = async (id, status, notes) => {
    setBusy(true);
    try {
      await base44.entities.NGO.update(id, { status, verification_notes: notes, verified_by: user?.email, verified_date: new Date().toISOString() });
      if (status === "verified") {
        await base44.entities.ReviewFlag.create({
          flag_type: "ngo_verification", entity_type: "NGO", entity_id: id, reason: "Verification approved", severity: "low", status: "resolved",
        });
      }
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const releaseDonation = async (d) => {
    setBusy(true);
    try {
      await base44.entities.Donation.update(d.id, { status: "released" });
      const ngo = await base44.entities.NGO.get(d.recipient_id);
      await base44.entities.NGO.update(d.recipient_id, { total_raised: (ngo.total_raised || 0) + d.amount });
      // resolve the related flag
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

  const approveWithdrawal = async (w, status) => {
    setBusy(true);
    try {
      await base44.entities.WithdrawalRequest.update(w.id, { status, reviewed_by: user?.email, reviewed_date: new Date().toISOString() });
      if (status === "approved") {
        const ngo = await base44.entities.NGO.get(w.ngo_id);
        await base44.entities.NGO.update(w.ngo_id, { total_utilized: (ngo.total_utilized || 0) + w.amount });
      }
      const fl = flags.find((f) => f.entity_id === w.id);
      if (fl) await base44.entities.ReviewFlag.update(fl.id, { status: "resolved" });
      load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  if (!isAdmin && user) {
    return <div className="p-10 text-center text-red-600">Admin access required to view the risk review dashboard.</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-emerald-600" /> Risk Review Dashboard</h1>
          <p className="text-sm text-emerald-700 mt-1">Verify NGOs, release or refund held donations, and approve large withdrawals.</p>
        </div>
        <Link to="/risk" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
          <ShieldAlert className="w-4 h-4" /> Risk & Suspicious Activity
        </Link>
      </div>

      <div className="flex gap-2 mt-6 flex-wrap">
        <TabBtn active={tab === "verifications"} onClick={() => setTab("verifications")} icon={ShieldCheck} label={`NGO Verifications (${ngos.length})`} />
        <TabBtn active={tab === "held"} onClick={() => setTab("held")} icon={Lock} label={`Held Donations (${heldDonations.length})`} />
        <TabBtn active={tab === "withdrawals"} onClick={() => setTab("withdrawals")} icon={HandCoins} label={`Withdrawals (${withdrawals.length})`} />
        <TabBtn active={tab === "flags"} onClick={() => setTab("flags")} icon={AlertTriangle} label={`Open Flags (${flags.length})`} />
      </div>

      {loading ? <div className="text-emerald-600 mt-6">Loading…</div> : (
        <div className="mt-6 space-y-4">
          {tab === "verifications" && (ngos.length === 0 ? <Empty label="No pending NGO verifications." /> : ngos.map((n) => (
            <VerificationCard key={n.id} ngo={n} onVerify={verifyNGO} busy={busy} />
          )))}

          {tab === "held" && (heldDonations.length === 0 ? <Empty label="No donations held for review." /> : heldDonations.map((d) => (
            <Card key={d.id} className="p-5 border-amber-200">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-green-900">₹{d.amount.toLocaleString("en-IN")} from {d.donor_name}</span>
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Risk score {d.risk_score}</span>
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">To {d.recipient_name} · {new Date(d.created_date).toLocaleString("en-IN")}</div>
                  {d.fraud_flags?.length > 0 && <div className="mt-2 text-xs text-amber-700 bg-amber-50/60 rounded-lg px-3 py-1.5">⚠ {d.fraud_flags.join("; ")}</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => releaseDonation(d)} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Unlock className="w-3.5 h-3.5 mr-1" /> Release</Button>
                  <Button size="sm" variant="outline" onClick={() => refundDonation(d)} disabled={busy} className="border-red-300 text-red-600 hover:bg-red-50"><XCircle className="w-3.5 h-3.5 mr-1" /> Refund</Button>
                </div>
              </div>
            </Card>
          )))}

          {tab === "withdrawals" && (withdrawals.length === 0 ? <Empty label="No pending withdrawal requests." /> : withdrawals.map((w) => (
            <Card key={w.id} className={`p-5 ${w.spike_flag || w.large_flag ? "border-amber-300 bg-amber-50/30" : "border-emerald-100"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <HandCoins className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-green-900">{w.ngo_name}</span>
                    <span className="font-bold text-emerald-700">₹{w.amount.toLocaleString("en-IN")}</span>
                    {w.large_flag && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Large withdrawal</span>}
                    {w.spike_flag && <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Spike detected</span>}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">Purpose: {w.purpose || "—"}</div>
                  <div className="text-xs text-gray-500">{new Date(w.created_date).toLocaleString("en-IN")}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveWithdrawal(w, "approved")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => approveWithdrawal(w, "rejected")} disabled={busy} className="border-red-300 text-red-600 hover:bg-red-50"><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                </div>
              </div>
            </Card>
          )))}

          {tab === "flags" && (flags.length === 0 ? <Empty label="No open risk flags." /> : flags.map((f) => (
            <Card key={f.id} className="p-4 border-emerald-100">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${f.severity === "critical" ? "text-red-600" : f.severity === "high" ? "text-amber-600" : "text-emerald-600"}`} />
                  <div>
                    <div className="font-medium text-green-900 text-sm">{f.entity_name || f.reason}</div>
                    <div className="text-xs text-gray-600">{f.reason} · {f.details}</div>
                    <div className="text-xs text-emerald-600 capitalize mt-0.5">{f.flag_type.replace("_", " ")} · {f.severity}</div>
                  </div>
                </div>
              </div>
            </Card>
          )))}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${active ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function Empty({ label }) {
  return <Card className="p-8 text-center text-emerald-700 border-emerald-100">{label}</Card>;
}

function VerificationCard({ ngo, onVerify, busy }) {
  const [notes, setNotes] = useState("");
  const bankMatch = ngo.bank_account_name && ngo.name &&
    ngo.bank_account_name.toLowerCase().replace(/\s/g, "") === ngo.name.toLowerCase().replace(/\s/g, "");
  return (
    <Card className="p-5 border-emerald-100">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-green-900">{ngo.name}</h3>
            <VerificationBadge status={ngo.status} />
          </div>
          <p className="text-xs text-emerald-600 mt-1">{ngo.city}, {ngo.state} · {ngo.category.replace("_", " ")}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
            <KV k="PAN" v={ngo.pan} />
            <KV k="Darpan" v={ngo.darpan_id} />
            <KV k="Reg no" v={ngo.registration_number} />
            <KV k="12A/12AB" v={ngo.twelve_a === "none" ? null : ngo.twelve_a} />
            <KV k="FCRA" v={ngo.ftr === "not_applicable" ? null : ngo.ftr} />
            <KV k="Rep" v={ngo.authorized_representative_name} />
          </div>
          <div className="mt-2 text-xs">
            <span className="text-gray-500">Bank: </span>
            <span className={bankMatch ? "text-emerald-700" : "text-red-600"}>{ngo.bank_account_name || "—"} {bankMatch ? "✓ matches entity" : "⚠ mismatch"}</span>
          </div>
          {ngo.documents?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ngo.documents.map((d, i) => <a key={i} href={d.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">📎 {d.label}</a>)}
            </div>
          )}
        </div>
        <div className="w-full md:w-64">
          <Label className="text-green-900 text-xs">Verification notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 text-xs" placeholder="Notes for the NGO…" />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => onVerify(ngo.id, "verified", notes)} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 flex-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify</Button>
            <Button size="sm" variant="outline" onClick={() => onVerify(ngo.id, "rejected", notes)} disabled={busy} className="border-red-300 text-red-600 hover:bg-red-50 flex-1"><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KV({ k, v }) {
  return <div><span className="text-gray-500">{k}: </span><span className={v ? "text-green-900 font-medium" : "text-gray-400"}>{v || "—"}</span></div>;
}