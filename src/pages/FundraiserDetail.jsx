import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DonateDialog from "@/components/DonateDialog";
import { Heart, MapPin, ArrowLeft, HandCoins, FileText, Users } from "lucide-react";

export default function FundraiserDetail() {
  const { id } = useParams();
  const [f, setF] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Fundraiser.get(id),
      base44.entities.Donation.filter({ recipient_id: id, recipient_type: "fundraiser" }, "-created_date", 50),
    ]).then(([fr, d]) => { setF(fr); setDonations(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-emerald-600">Loading…</div>;
  if (!f) return <div className="p-10 text-center text-red-600">Fundraiser not found.</div>;

  const pct = f.goal_amount ? Math.min(100, Math.round((f.raised_amount / f.goal_amount) * 100)) : 0;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link to="/fundraisers" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline mb-4"><ArrowLeft className="w-4 h-4" /> Back</Link>

      <Card className="p-6 border-emerald-100">
        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block capitalize">{f.category}</span>
        <h1 className="text-2xl font-bold text-green-900 mt-2 flex items-center gap-2"><Heart className="w-5 h-5 text-emerald-600" /> {f.title}</h1>
        <p className="text-sm text-emerald-700 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" /> {f.beneficiary_name} · {f.city}, {f.state}</p>

        {f.beneficiary_story && <p className="text-sm text-gray-700 mt-4">{f.beneficiary_story}</p>}
        {f.description && <p className="text-sm text-gray-600 mt-2">{f.description}</p>}
        {f.medical_document_url && (
          <a href={f.medical_document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-600 hover:underline"><FileText className="w-4 h-4" /> View supporting document</a>
        )}

        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold text-green-900">₹{(f.raised_amount || 0).toLocaleString("en-IN")} raised</span>
            <span className="text-emerald-600">of ₹{(f.goal_amount || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="h-3 bg-emerald-50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-green-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-emerald-600 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {donations.length} donors</span>
            <Button onClick={() => setDonateOpen(true)} disabled={f.status !== "active"} className="bg-emerald-600 hover:bg-emerald-700"><HandCoins className="w-4 h-4 mr-1" /> Donate</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 mb-3">Recent supporters</h2>
        {donations.length === 0 ? <p className="text-sm text-emerald-600">Be the first to support.</p> : (
          <div className="space-y-2">
            {donations.map((d) => (
              <div key={d.id} className="flex justify-between text-sm py-2 border-b border-emerald-50 last:border-0">
                <div>
                  <span className="text-green-900 font-medium">{d.donor_name}</span>
                  <span className="text-xs text-emerald-600 ml-2">{new Date(d.created_date).toLocaleDateString("en-IN")}</span>
                </div>
                <span className="font-semibold text-emerald-700">₹{d.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DonateDialog open={donateOpen} onClose={() => setDonateOpen(false)} recipient={f} recipientType="fundraiser" onDone={() => window.location.reload()} />
    </div>
  );
}