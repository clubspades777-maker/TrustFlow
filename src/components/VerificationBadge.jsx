import React from "react";
import { ShieldCheck, ShieldAlert, Clock, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

const map = {
  verified: { icon: ShieldCheck, label: "Verified", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  pending_verification: { icon: Clock, label: "Pending Verification", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  rejected: { icon: ShieldX, label: "Rejected", cls: "bg-red-100 text-red-700 border-red-300" },
  suspended: { icon: ShieldAlert, label: "Suspended", cls: "bg-red-100 text-red-700 border-red-300" },
};

export default function VerificationBadge({ status, size = "sm" }) {
  const conf = map[status] || map.pending_verification;
  const Icon = conf.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-medium", conf.cls, size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm")}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {conf.label}
    </span>
  );
}