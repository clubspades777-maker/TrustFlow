import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, XCircle, AlertTriangle, Flag } from "lucide-react";

// Donations that are held for review or already flagged as suspicious.
export default function FlaggedDonationsTab({ donations, onRelease, onRefund, onFlag, busy }) {
  if (!donations.length) {
    return <Empty label="No flagged or held donations." />;
  }
  return (
    <div className="space-y-3">
      {donations.map((d) => (
        <Card key={d.id} className="p-5 border-amber-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {d.status === "held_for_review" ? <Lock className="w-4 h-4 text-amber-600" /> : <Flag className="w-4 h-4 text-red-600" />}
                <span className="font-semibold text-green-900">₹{d.amount.toLocaleString("en-IN")}</span>
                <span className="text-sm text-green-800">from {d.donor_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "flagged" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {d.status === "flagged" ? "Flagged" : "Held"} · risk {d.risk_score || 0}
                </span>
              </div>
              <div className="text-xs text-emerald-600 mt-1">To {d.recipient_name} · {new Date(d.created_date).toLocaleString("en-IN")}</div>
              {d.donor_email && <div className="text-xs text-gray-500">{d.donor_email}</div>}
              {d.fraud_flags?.length > 0 && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50/60 rounded-lg px-3 py-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {d.fraud_flags.map((f, i) => <span key={i}>⚠ {f}</span>)}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => onRelease(d)} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700"><Unlock className="w-3.5 h-3.5 mr-1" /> Release</Button>
              <Button size="sm" variant="outline" onClick={() => onFlag(d)} disabled={busy} className="border-amber-300 text-amber-700 hover:bg-amber-50"><Flag className="w-3.5 h-3.5 mr-1" /> Flag</Button>
              <Button size="sm" variant="outline" onClick={() => onRefund(d)} disabled={busy} className="border-red-300 text-red-600 hover:bg-red-50"><XCircle className="w-3.5 h-3.5 mr-1" /> Refund</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Empty({ label }) {
  return <Card className="p-8 text-center text-emerald-700 border-emerald-100 flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> {label}</Card>;
}