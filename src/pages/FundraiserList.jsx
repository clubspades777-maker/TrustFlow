import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Plus, MapPin } from "lucide-react";

export default function FundraiserList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    base44.entities.Fundraiser.filter({ status: "active" }, "-raised_amount", 100).then((f) => { setItems(f); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><Heart className="w-6 h-6 text-emerald-600" /> Individual Fundraisers</h1>
          <p className="text-sm text-emerald-700">Verified personal emergencies — medical, education, livelihood.</p>
        </div>
        <Link to="/fundraisers/create"><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Start a fundraiser</Button></Link>
      </div>

      {loading ? <div className="text-emerald-600 mt-6">Loading…</div> : items.length === 0 ? (
        <Card className="p-10 text-center text-emerald-700 border-emerald-100 mt-6">No active fundraisers. Start one for a verified personal emergency.</Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {items.map((f) => {
            const pct = f.goal_amount ? Math.min(100, Math.round((f.raised_amount / f.goal_amount) * 100)) : 0;
            return (
              <Link key={f.id} to={`/fundraisers/${f.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow border-emerald-100 h-full flex flex-col">
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block w-fit capitalize">{f.category}</span>
                  <h3 className="font-semibold text-green-900 mt-2">{f.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{f.beneficiary_story}</p>
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.beneficiary_name} · {f.city}</p>
                  <div className="mt-3 h-2 bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-green-700" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="font-semibold text-green-900">₹{(f.raised_amount || 0).toLocaleString("en-IN")}</span>
                    <span className="text-emerald-600">of ₹{(f.goal_amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}