import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileCheck, Upload, Loader2, ArrowLeft, Plus, HandCoins } from "lucide-react";

const DOC_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt" },
  { value: "utilization_certificate", label: "Utilization Certificate" },
  { value: "project_report", label: "Project Report" },
  { value: "beneficiary_info", label: "Beneficiary Information" },
  { value: "photograph", label: "Photograph" },
  { value: "ca_audit", label: "CA Auditor Documentation" },
  { value: "other", label: "Other" },
];

export default function ExpenseReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ngo, setNgo] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ project_name: "", description: "", amount: "", doc_type: "invoice", beneficiary_name: "", beneficiary_count: 1, spent_date: "" });
  const [docUrl, setDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawal, setWithdrawal] = useState({ amount: "", purpose: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    base44.entities.NGO.get(id).then((n) => setNgo(n)).catch(() => {});
    loadEntries();
  }, [id]);

  const loadEntries = () => {
    base44.entities.ExpenseEntry.filter({ recipient_id: id, recipient_type: "ngo" }, "-spent_date", 100).then(setEntries).catch(() => {});
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadPublicFile({ file }); setDocUrl(file_url); }
    catch (e) { setError("Upload failed"); }
    setUploading(false);
  };

  const submit = async () => {
    setError("");
    if (!form.amount || !form.doc_type) { setError("Amount and document type are required."); return; }
    setSubmitting(true);
    try {
      await base44.entities.ExpenseEntry.create({
        recipient_type: "ngo", recipient_id: id, recipient_name: ngo?.name,
        project_name: form.project_name, description: form.description,
        amount: Number(form.amount), doc_type: form.doc_type, document_url: docUrl || undefined,
        beneficiary_name: form.beneficiary_name, beneficiary_count: Number(form.beneficiary_count) || 1,
        spent_date: form.spent_date || undefined,
      });
      const newUtil = (ngo?.total_utilized || 0) + Number(form.amount);
      await base44.entities.NGO.update(id, { total_utilized: newUtil });
      setNgo({ ...ngo, total_utilized: newUtil });
      setForm({ project_name: "", description: "", amount: "", doc_type: "invoice", beneficiary_name: "", beneficiary_count: 1, spent_date: "" });
      setDocUrl("");
      loadEntries();
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    setSubmitting(false);
  };

  const requestWithdrawal = async () => {
    setError("");
    if (!withdrawal.amount) { setError("Enter an amount."); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("requestWithdrawal", { ngo_id: id, amount: Number(withdrawal.amount), purpose: withdrawal.purpose });
      setShowWithdrawal(false);
      setWithdrawal({ amount: "", purpose: "" });
      const needsReview = res.data?.needs_review;
      alert(needsReview ? `Withdrawal request created — flagged for review (risk score ${res.data.risk_score}). An admin will review before funds are released.` : "Withdrawal request submitted for admin approval.");
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    setSubmitting(false);
  };

  if (!ngo) return <div className="p-10 text-emerald-600">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link to={`/ngos/${id}`} className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline mb-4"><ArrowLeft className="w-4 h-4" /> Back to {ngo.name}</Link>

      <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><FileCheck className="w-6 h-6 text-emerald-600" /> Utilization Reporting</h1>
      <p className="text-sm text-emerald-700 mt-1">{ngo.name} · ₹{(ngo.total_raised || 0).toLocaleString("en-IN")} raised · ₹{(ngo.total_utilized || 0).toLocaleString("en-IN")} utilized</p>

      {/* Report expense */}
      <Card className="p-6 border-emerald-100 mt-6 space-y-4">
        <h2 className="font-semibold text-green-900 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600" /> Report an expense</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project name"><Input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="Mid-day meal scheme" /></Field>
          <Field label="Document type"><select value={form.doc_type} onChange={(e) => set("doc_type", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select></Field>
        </div>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Amount (₹) *"><Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
          <Field label="Beneficiary name"><Input value={form.beneficiary_name} onChange={(e) => set("beneficiary_name", e.target.value)} /></Field>
          <Field label="Beneficiary count"><Input type="number" value={form.beneficiary_count} onChange={(e) => set("beneficiary_count", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Spent date"><Input type="date" value={form.spent_date} onChange={(e) => set("spent_date", e.target.value)} /></Field>
          <div>
            <Label className="text-green-900 text-xs">Proof document</Label>
            <div className="mt-1 flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
                <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} accept="image/*,application/pdf" />
              </label>
              {docUrl && <span className="text-xs text-emerald-600 truncate">✓ uploaded</span>}
            </div>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add expense entry"}</Button>
      </Card>

      {/* Existing entries */}
      <h2 className="font-semibold text-green-900 mt-8 mb-3">Reported expenses ({entries.length})</h2>
      {entries.length === 0 ? <Card className="p-6 text-center text-emerald-700 border-emerald-100">No expenses reported yet.</Card> : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="p-3 border-emerald-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0"><FileCheck className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2"><span className="font-medium text-green-900 text-sm">{e.project_name || e.doc_type.replace("_", " ")}</span><span className="font-semibold text-emerald-700 text-sm">₹{e.amount.toLocaleString("en-IN")}</span></div>
                <div className="text-xs text-emerald-600 capitalize">{e.doc_type.replace("_", " ")}{e.beneficiary_name ? ` · 👤 ${e.beneficiary_name}` : ""}{e.spent_date ? ` · ${new Date(e.spent_date).toLocaleDateString("en-IN")}` : ""}</div>
                {e.document_url && <a href={e.document_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">View document →</a>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Withdrawal request */}
      <Card className="p-6 border-emerald-100 mt-8">
        <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-2"><HandCoins className="w-4 h-4 text-emerald-600" /> Request withdrawal</h2>
        <p className="text-xs text-emerald-700 mb-3">Large or unusual withdrawal requests are held for admin review — they are never auto-released.</p>
        {!showWithdrawal ? (
          <Button onClick={() => setShowWithdrawal(true)} variant="outline" className="border-emerald-300 text-emerald-700">New withdrawal request</Button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)"><Input type="number" value={withdrawal.amount} onChange={(e) => setWithdrawal((w) => ({ ...w, amount: e.target.value }))} /></Field>
              <Field label="Purpose"><Input value={withdrawal.purpose} onChange={(e) => setWithdrawal((w) => ({ ...w, purpose: e.target.value }))} /></Field>
            </div>
            <div className="flex gap-2">
              <Button onClick={requestWithdrawal} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}</Button>
              <Button variant="outline" onClick={() => setShowWithdrawal(false)} className="border-emerald-300 text-emerald-700">Cancel</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return <div><Label className="text-green-900 text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}