import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins, TrendingUp, FileCheck, AlertTriangle, ArrowRight, Receipt } from "lucide-react";

export default function DonorDashboard() {
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (!u?.email) { setLoading(false); return; }
      Promise.all([
        base44.entities.Donation.filter({ donor_email: u.email }, "-created_date", 100),
      ]).then(([d]) => {
        setDonations(d);
        // fetch expenses for each NGO donated to
        const ids = [...new Set(d.map((x) => x.recipient_id))];
        Promise.all(ids.map((id) => base44.entities.ExpenseEntry.filter({ recipient_id: id, recipient_type: "ngo" }, "-spent_date", 50)))
          .then((arr) => setExpenses(arr.flat()))
          .finally(() => setLoading(false));
      }).catch(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const totalGiven = donations.filter((d) => d.status === "completed").reduce((s, d) => s + d.amount, 0);
  const totalHeld = donations.filter((d) => d.status === "held_for_review").reduce((s, d) => s + d.amount, 0);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><HandCoins className="w-6 h-6 text-emerald-600" /> My Donations</h1>
      <p className="text-sm text-emerald-700 mt-1">Track exactly where your contributions went — every expense is backed by documents.</p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Stat label="Total given" value={`₹${totalGiven.toLocaleString("en-IN")}`} icon={TrendingUp} />
        <Stat label="Held for review" value={`₹${totalHeld.toLocaleString("en-IN")}`} icon={AlertTriangle} />
        <Stat label="Recipients supported" value={new Set(donations.map((d) => d.recipient_id)).size} icon={FileCheck} />
      </div>

      {loading ? (
        <div className="text-emerald-600 mt-6">Loading…</div>
      ) : !user?.email ? (
        <Card className="p-8 text-center text-emerald-700 border-emerald-100 mt-6">Sign in to see your donation history.</Card>
      ) : donations.length === 0 ? (
        <Card className="p-8 text-center text-emerald-700 border-emerald-100 mt-6">
          You haven't donated yet. <Link to="/ngos" className="text-emerald-600 font-medium hover:underline">Explore NGOs →</Link>
        </Card>
      ) : (
        <>
          {/* Donation history */}
          <h2 className="font-semibold text-green-900 mt-8 mb-3">Your contributions</h2>
          <div className="space-y-3">
            {donations.map((d) => (
              <Card key={d.id} className="p-4 border-emerald-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Link to={d.recipient_type === "ngo" ? `/ngos/${d.recipient_id}` : `/fundraisers/${d.recipient_id}`} className="font-medium text-green-900 hover:underline">{d.recipient_name}</Link>
                    <div className="text-xs text-emerald-600">{new Date(d.created_date).toLocaleDateString("en-IN")} · {d.donor_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700">₹{d.amount.toLocaleString("en-IN")}</span>
                    {d.status === "completed" && <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Released</span>}
                    {d.status === "held_for_review" && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Under review</span>}
                  </div>
                </div>
                {d.fraud_flags?.length > 0 && d.status === "held_for_review" && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50/60 rounded-lg px-3 py-1.5">⚠ {d.fraud_flags.join("; ")}</div>
                )}
                {d.message && <div className="mt-2 text-sm text-gray-600 italic">"{d.message}"</div>}
              </Card>
            ))}
          </div>

          {/* Utilization across supported causes */}
          <h2 className="font-semibold text-green-900 mt-8 mb-3 flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600" /> How your supported causes spent funds</h2>
          {expenses.length === 0 ? (
            <Card className="p-6 text-center text-emerald-700 border-emerald-100">No utilization reports filed yet by the causes you supported.</Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((e) => (
                <Card key={e.id} className="p-4 border-emerald-100 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0"><FileCheck className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-green-900 text-sm">{e.recipient_name} — {e.project_name || e.doc_type.replace("_", " ")}</span>
                      <span className="font-semibold text-emerald-700 text-sm">₹{e.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{e.description}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-emerald-600">
                      <span className="capitalize">{e.doc_type.replace("_", " ")}</span>
                      {e.beneficiary_name && <span>· 👤 {e.beneficiary_name}</span>}
                      {e.beneficiary_count > 1 && <span>· {e.beneficiary_count} beneficiaries</span>}
                      {e.spent_date && <span>· {new Date(e.spent_date).toLocaleDateString("en-IN")}</span>}
                      {e.document_url && <a href={e.document_url} target="_blank" rel="noreferrer" className="hover:underline">View proof →</a>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <Card className="p-4 border-emerald-100">
      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2"><Icon className="w-5 h-5" /></div>
      <div className="text-xl font-bold text-green-900">{value}</div>
      <div className="text-xs text-emerald-600 font-medium">{label}</div>
    </Card>
  );
}