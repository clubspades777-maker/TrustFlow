import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Flame, ChevronRight } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { donationTimeSeries, rankSpikeRecipients, SPIKE_MULTIPLIER } from "@/lib/riskAnalytics";

// Time-series chart of donation volume per recipient + ranked spike list.
export default function DonationSpikesTab({ donations, onSelectRecipient }) {
  const [window, setWindow] = useState(30);
  const { byRecipient, days } = donationTimeSeries(donations, window);
  const spikes = rankSpikeRecipients(donations, 2, 30);

  // Aggregate total volume per day for the chart.
  const chartData = days.map((day) => {
    const total = Object.values(byRecipient).reduce((s, r) => s + (r.byDay[day] || 0), 0);
    return { day, total };
  });

  // Detect spike points: days where total > average * SPIKE_MULTIPLIER (relative to the series mean).
  const mean = chartData.reduce((s, p) => s + p.total, 0) / Math.max(chartData.length, 1);
  const spikePoints = chartData.filter((p) => p.total > 0 && mean > 0 && p.total >= mean * 4).map((p) => ({ ...p, spike: true }));

  return (
    <div className="space-y-6">
      <Card className="p-5 border-emerald-100">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-green-900 text-sm">Donation volume over time</h3>
          </div>
          <div className="flex gap-1">
            {[7, 30].map((w) => (
              <button key={w} onClick={() => setWindow(w)} className={`text-xs px-3 py-1 rounded-lg ${window === w ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 border border-emerald-200"}`}>
                {w}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7e0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} interval={Math.floor(days.length / 8)} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} stroke="#6b7280" width={50} />
              <Tooltip
                formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Donations"]}
                labelFormatter={(l) => l}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#a7f3d0" }}
              />
              <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} dot={false} name="Donations" />
              {spikePoints.map((p) => (
                <ReferenceDot key={p.day} x={p.day} y={p.total} r={5} fill="#dc2626" stroke="#fff" strokeWidth={1} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {spikePoints.length > 0 && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><Flame className="w-3 h-3" /> {spikePoints.length} spike day(s) highlighted (≥4× the period average)</p>
        )}
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-green-900 text-sm">Recipients with anomalous inflow (last 48h vs monthly avg)</h3>
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">≥ {SPIKE_MULTIPLIER}× average</span>
        </div>
        {spikes.length === 0 ? (
          <Card className="p-6 text-center text-xs text-gray-400 border-dashed">No recipients currently exceeding the spike threshold.</Card>
        ) : (
          <div className="space-y-2">
            {spikes.map((s) => {
              const mult = s.multiplier === Infinity ? "∞" : `${s.multiplier.toFixed(0)}×`;
              const sev = s.multiplier >= SPIKE_MULTIPLIER * 2 ? "critical" : "high";
              return (
                <Card key={s.recipient_id} className={`p-4 border ${sev === "critical" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                  <button onClick={() => onSelectRecipient(s)} className="w-full flex items-center justify-between gap-3 text-left">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-green-900 text-sm">{s.recipient_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${sev === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{mult} avg</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        ₹{s.recent.toLocaleString("en-IN")} in last 48h · monthly avg ₹{s.monthlyAvg.toLocaleString("en-IN", { maximumFractionDigits: 0 })} · {s.donations.length} donations
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}