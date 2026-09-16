import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VerificationBadge from "@/components/VerificationBadge";
import DonateDialog from "@/components/DonateDialog";
import { ShieldCheck, MapPin, Building2, CreditCard, FileText, HandCoins, TrendingUp, ArrowLeft, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function NGODetail() {
  const { id } = useParams();
  const [ngo, setNgo] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.NGO.get(id),
      base44.entities.ExpenseEntry.filter({ recipient_id: id, recipient_type: "ngo" }, "-spent_date", 100),
      base44.entities.Donation.filter({ recipient_id: id, recipient_type: "ngo" }, "-created_date", 50),
    ]).then(([n, e, d]) => { setNgo(n); setExpenses(e); setDonations(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-emerald-600">Loading…</div>;
  if (!ngo) return <div className="p-10 text-center text-red-600">NGO not found.</div>;

  const utilized = ngo.total_utilized || expenses.reduce((s, e) => s + e.amount, 0);
  const raised = ngo.total_raised || 0;
  const utilPct = raised ? Math.min(100, Math.round((utilized / raised) * 100)) : 0;
  const canDonate = ngo.status === "verified";

  const docs = [
    { label: "NGO Registration", value: ngo.registration_number },
    { label: "PAN", value: ngo.pan },
    { label: "Darpan ID", value: ngo.darpan_id },
    { label: "12A / 12AB", value: ngo.twelve_a === "none" ? null : `${ngo.twelve_a}${ngo.twelve_a_number ? " · " + ngo.twelve_a_number : ""}` },
    { label: "FCRA (FTR)", value: ngo.ftr === "not_applicable" ? "Not applicable" : `${ngo.ftr}${ngo.ftr_number ? " · " + ngo.ftr_number : ""}` },
    { label: "ATG", value: ngo.atg },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link to="/ngos" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline mb-4"><ArrowLeft className="w-4 h-4" /> Back to directory</Link>

      {/* Header */}
      <Card className="p-6 border-emerald-100">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-800 flex items-center justify-center text-white font-bold text-2xl">{ngo.name?.[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-green-900">{ngo.name}</h1>
              <VerificationBadge status={ngo.status} />
            </div>
            <p className="text-sm text-emerald-700 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" /> {ngo.registered_address}, {ngo.city}, {ngo.state} {ngo.pincode}</p>
            <p className="text-sm text-gray-600 mt-2">{ngo.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setDonateOpen(true)} disabled={!canDonate} className="bg-emerald-600 hover:bg-emerald-700">
              <HandCoins className="w-4 h-4 mr-1" /> Donate
            </Button>
            <Link to={`/ngos/${ngo.id}/expenses`}>
              <Button variant="outline" className="border-emerald-300 text-emerald-700 w-full">
                <FileCheck className="w-4 h-4 mr-1" /> Report utilization
              </Button>
            </Link>
            {!canDonate && <span className="text-xs text-amber-600 text-center max-w-[160px]">Not verified — cannot receive funds</span>}
          </div>
        </div>

        {/* Utilization summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-50">
          <Metric label="Total raised" value={`₹${raised.toLocaleString("en-IN")}`} icon={TrendingUp} />
          <Metric label="Utilized" value={`₹${utilized.toLocaleString("en-IN")}`} icon={FileCheck} />
          <Metric label="Utilization" value={`${utilPct}%`} icon={CheckCircle2} />
          <Metric label="Need level" value={ngo.needs_level} icon={AlertTriangle} />
        </div>
        <div className="mt-4 h-3 bg-emerald-50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-green-700" style={{ width: `${utilPct}%` }} />
        </div>
        <p className="text-xs text-emerald-600 mt-1">₹{raised.toLocaleString("en-IN")} received · ₹{utilized.toLocaleString("en-IN")} spent on verified projects · ₹{(raised - utilized).toLocaleString("en-IN")} available</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Verification panel */}
        <Card className="p-6 border-emerald-100">
          <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Compliance verification</h2>
          <div className="space-y-2.5">
            {docs.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm py-2 border-b border-emerald-50 last:border-0">
                <span className="text-gray-600">{d.label}</span>
                <span className={`font-medium ${d.value ? "text-green-900" : "text-gray-400"}`}>{d.value || "Not provided"}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-emerald-50">
            <h3 className="text-sm font-semibold text-green-900 flex items-center gap-1.5 mb-2"><CreditCard className="w-4 h-4 text-emerald-600" /> Bank account</h3>
            <div className="text-sm space-y-1.5">
              <Row label="Account name" value={ngo.bank_account_name} />
              <Row label="Account number" value={ngo.bank_account_number ? `••••${ngo.bank_account_number.slice(-4)}` : "—"} />
              <Row label="IFSC" value={ngo.bank_ifsc} />
              <Row label="Bank" value={ngo.bank_name} />
            </div>
            {ngo.bank_account_name && ngo.name && ngo.bank_account_name.toLowerCase().replace(/\s/g, "") === ngo.name.toLowerCase().replace(/\s/g, "") && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Bank account name matches registered entity</div>
            )}
            {ngo.bank_account_name && ngo.name && ngo.bank_account_name.toLowerCase().replace(/\s/g, "") !== ngo.name.toLowerCase().replace(/\s/g, "") && (
              <div className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Bank name does NOT match entity name — flagged</div>
            )}
          </div>
          {ngo.documents?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-emerald-50">
              <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-emerald-600" /> Uploaded documents</h3>
              <div className="space-y-1.5">
                {ngo.documents.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="block text-sm text-emerald-700 hover:underline truncate">📎 {doc.label}</a>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Authorized rep + beneficiaries */}
        <div className="space-y-6">
          <Card className="p-6 border-emerald-100">
            <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-emerald-600" /> Authorized representative</h2>
            <div className="text-sm space-y-1.5">
              <Row label="Name" value={ngo.authorized_representative_name} />
              <Row label="Designation" value={ngo.authorized_representative_designation} />
              <Row label="Email" value={ngo.authorized_representative_email} />
              <Row label="Phone" value={ngo.authorized_representative_phone} />
            </div>
            {ngo.beneficiary_summary && (
              <div className="mt-4 pt-4 border-t border-emerald-50">
                <h3 className="text-sm font-semibold text-green-900 mb-1">Beneficiaries</h3>
                <p className="text-sm text-gray-600">{ngo.beneficiary_summary}</p>
              </div>
            )}
          </Card>

          {ngo.verification_notes && (
            <Card className="p-5 border-amber-200 bg-amber-50/50">
              <div className="text-sm text-amber-800"><span className="font-semibold">Verification notes:</span> {ngo.verification_notes}</div>
            </Card>
          )}
        </div>
      </div>

      {/* Utilization ledger */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-4"><FileCheck className="w-5 h-5 text-emerald-600" /> Utilization ledger</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-emerald-600">No expenses reported yet.</p>
        ) : (
          <div className="space-y-3">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl border border-emerald-50 bg-emerald-50/30">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0"><FileText className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-green-900 text-sm">{e.project_name || e.doc_type.replace("_", " ")}</span>
                    <span className="font-semibold text-emerald-700 text-sm">₹{e.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{e.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-emerald-600">
                    <span className="capitalize">{e.doc_type.replace("_", " ")}</span>
                    {e.beneficiary_name && <span>· 👤 {e.beneficiary_name}</span>}
                    {e.spent_date && <span>· {new Date(e.spent_date).toLocaleDateString("en-IN")}</span>}
                    {e.document_url && <a href={e.document_url} target="_blank" rel="noreferrer" className="hover:underline">View document →</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent donations */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 mb-4">Recent donations</h2>
        {donations.length === 0 ? <p className="text-sm text-emerald-600">No donations yet. Be the first to give.</p> : (
          <div className="space-y-2">
            {donations.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-emerald-50 last:border-0">
                <div>
                  <span className="text-green-900 font-medium">{d.donor_name}</span>
                  <span className="text-xs text-emerald-600 ml-2">{new Date(d.created_date).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-700">₹{d.amount.toLocaleString("en-IN")}</span>
                  {d.status === "held_for_review" && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Held</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DonateDialog open={donateOpen} onClose={() => setDonateOpen(false)} recipient={ngo} recipientType="ngo" onDone={() => window.location.reload()} />
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-emerald-600"><Icon className="w-3.5 h-3.5" /><span className="text-xs font-medium">{label}</span></div>
      <div className="text-lg font-bold text-green-900 mt-0.5 capitalize">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${value ? "text-green-900" : "text-gray-400"}`}>{value || "—"}</span>
    </div>
  );
}