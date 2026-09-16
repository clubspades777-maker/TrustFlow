import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

const PRESETS = [500, 1000, 2500, 5000, 10000];

export default function DonateDialog({ open, onClose, recipient, recipientType = "ngo", onDone }) {
  const [amount, setAmount] = React.useState(1000);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");

  const displayName = recipient?.name || recipient?.title || "this cause";

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("processDonation", {
        recipient_type: recipientType,
        recipient_id: recipient.id,
        amount: Number(amount),
        donor_name: name,
        donor_email: email,
        message,
        payment_instrument: "upi",
        device_fingerprint: navigator.userAgent.slice(0, 60),
      });
      setResult(res.data);
      if (res.data.status === "completed" && onDone) onDone();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Donation failed");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setResult(null);
    setError("");
    setAmount(1000);
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Donate to {displayName}</DialogTitle>
          <DialogDescription>Your contribution is tracked transparently. Suspicious patterns are held for review.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-4 space-y-3 text-center">
            {result.status === "completed" ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="text-lg font-semibold text-green-900">Thank you! ₹{amount} donated</div>
                <div className="text-sm text-emerald-700">Funds released to {displayName}. Track utilization in My Donations.</div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-amber-100 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-amber-600" />
                </div>
                <div className="text-lg font-semibold text-green-900">Donation held for review</div>
                <div className="text-sm text-amber-700">
                  Our risk system flagged this transaction (score {result.risk_score}) for manual verification before release.
                  This protects against fraud and money laundering.
                </div>
              </>
            )}
            <Button onClick={close} className="bg-emerald-600 hover:bg-emerald-700 w-full">Close</Button>
          </div>
        ) : (
          <>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-green-900">Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 text-lg font-semibold" />
              <div className="flex gap-2 mt-2 flex-wrap">
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => setAmount(p)} className={`px-3 py-1 rounded-full text-xs font-medium border ${amount == p ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-300"}`}>₹{p.toLocaleString("en-IN")}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-green-900">Your name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous donor" className="mt-1" />
              </div>
              <div>
                <Label className="text-green-900">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-green-900">Message (optional)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="mt-1" />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={loading || !amount} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Donate ₹${Number(amount || 0).toLocaleString("en-IN")}`}
            </Button>
          </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}