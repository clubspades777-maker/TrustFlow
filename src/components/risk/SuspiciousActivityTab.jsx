import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, CreditCard, Zap, Users, ChevronDown, ChevronRight, Flag } from "lucide-react";
import {
  groupByDeviceFingerprint,
  groupByPaymentInstrument,
  detectVelocityBursts,
} from "@/lib/riskAnalytics";

// Groups donations into suspicious clusters: shared device fingerprint, reused
// payment instrument, and velocity bursts to the same recipient.
export default function SuspiciousActivityTab({ donations, onFlag, busy }) {
  const [expanded, setExpanded] = useState(null);
  const deviceGroups = groupByDeviceFingerprint(donations);
  const instrumentGroups = groupByPaymentInstrument(donations);
  const velocityGroups = detectVelocityBursts(donations);

  const sections = [
    { title: "Device fingerprint reuse", icon: Smartphone, subtitle: "Same device across multiple donor identities", groups: deviceGroups, kind: "device" },
    { title: "Payment instrument reuse", icon: CreditCard, subtitle: "Same card/UPI across many donations", groups: instrumentGroups, kind: "instrument" },
    { title: "Velocity bursts", icon: Zap, subtitle: `Many donations to one recipient in ${20} min`, groups: velocityGroups, kind: "velocity" },
  ];

  const totalClusters = deviceGroups.length + instrumentGroups.length + velocityGroups.length;
  if (!totalClusters) {
    return <Card className="p-8 text-center text-emerald-700 border-emerald-100">No suspicious account activity detected.</Card>;
  }

  const toggle = (key) => setExpanded((e) => (e === key ? null : key));

  return (
    <div className="space-y-6">
      {sections.map((sec) => {
        const Icon = sec.icon;
        return (
          <div key={sec.kind}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-green-900 text-sm">{sec.title}</h3>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{sec.groups.length} clusters</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{sec.subtitle}</p>
            {sec.groups.length === 0 ? (
              <Card className="p-4 text-center text-xs text-gray-400 border-dashed">No clusters</Card>
            ) : (
              <div className="space-y-2">
                {sec.groups.map((g) => {
                  const key = `${sec.kind}-${g.key}`;
                  const open = expanded === key;
                  return (
                    <Card key={key} className={`p-4 border ${g.severity === "critical" ? "border-red-200 bg-red-50/30" : g.severity === "high" ? "border-amber-200 bg-amber-50/30" : "border-emerald-100"}`}>
                      <button onClick={() => toggle(key)} className="w-full flex items-center justify-between gap-3 text-left">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {open ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
                            <span className="font-mono text-xs text-green-900 truncate max-w-[200px]">{g.key}</span>
                            <SeverityBadge severity={g.severity} />
                          </div>
                          <div className="text-xs text-gray-600 mt-1 flex items-center gap-3 flex-wrap pl-6">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.donorCount} donors</span>
                            <span>{g.recipientCount} recipient(s)</span>
                            <span className="font-medium text-emerald-700">₹{g.totalAmount.toLocaleString("en-IN")}</span>
                            {g.count && <span>{g.count} donations</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onFlag(g); }} disabled={busy} className="border-amber-300 text-amber-700 hover:bg-amber-50 flex-shrink-0">
                          <Flag className="w-3.5 h-3.5 mr-1" /> Flag cluster
                        </Button>
                      </button>
                      {open && (
                        <div className="mt-3 pl-6 space-y-1 border-t border-emerald-50 pt-2">
                          {g.donations.slice(0, 12).map((d) => (
                            <div key={d.id} className="text-xs text-gray-600 flex justify-between gap-2">
                              <span className="truncate">{d.donor_name} · {d.donor_email || "—"}</span>
                              <span className="text-emerald-700 font-medium flex-shrink-0">₹{d.amount.toLocaleString("en-IN")} → {d.recipient_name}</span>
                            </div>
                          ))}
                          {g.donations.length > 12 && <div className="text-xs text-gray-400">+{g.donations.length - 12} more…</div>}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const map = { critical: "bg-red-100 text-red-700", high: "bg-amber-100 text-amber-700", medium: "bg-emerald-100 text-emerald-700" };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${map[severity] || map.medium}`}>{severity}</span>;
}