import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HandCoins, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

// Withdrawals flagged as large or spike, with inflow context and approve/reject.
export default function HighRiskWithdrawalsTab({ withdrawals, donations, onApprove, onReject, busy }) {
  const [notes, setNotes] = useState({});
  if (!withdrawals.length) {
    return <Card className="p-8 text-center text-emerald-700 border-emerald-100 flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> No flagged withdrawal requests.</Card>;
  }
  return (
    <div className="space-y-3">
      {withdrawals.map((w) => {
        const recentInflow = donations
          .filter((d) => d.recipient_id === w.ngo_id && new Date(d.created_date) >= new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
          .reduce((s, d) => s + (d.amount || 0), 0);
        const sev = w.spike_flag ? "critical" : "high";
        return (
          <Card key={w.id} className={`p-5 ${sev === "critical" ? "border-red-300 bg-red-50/30" : "border-amber-300 bg-amber-50/30"}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <HandCoins className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-green-900">{w.ngo_name}</span>
                  <span className="font-bold text-emerald-700">₹{w.amount.toLocaleString("en-IN")}</span>
                  {w.large_flag && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Large withdrawal</span>}
                  {w.spike_flag && <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Spike detected</span>}
                </div>
                <div className="text-xs text-emerald-600 mt-1">Purpose: {w.purpose || "—"}</div>
                <div className="text-xs text-gray-500">{new Date(w.created_date).toLocaleString("en-IN")}</div>
                <div className="mt-2 text-xs bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
                  <span className="text-gray-500">Inflow context: </span>
                  <span className="font-medium text-green-800">₹{recentInflow.toLocaleString("en-IN")} in last 48h</span>
                  {recentInflow > 0 && w.amount >= recentInflow * 0.8 && (
                    <span className="text-red-600 ml-2">⚠ Withdrawal ≥ 80% of recent inflow</span>
                  )}
                </div>
              </div>
              <div className="w-full md:w-64 flex-shrink-0">
                <Label className="text-green-900 text-xs">Admin notes</Label>
                <Textarea value={notes[w.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [w.id]: e.target.value }))} rows={2} className="mt-1 text-xs" placeholder="Review notes…" />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => onApprove(w, notes[w.id] || "")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 flex-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(w, notes[w.id] || "")} disabled={busy} className="border-red-300 text-red-600 hover:bg-red-50 flex-1"><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}