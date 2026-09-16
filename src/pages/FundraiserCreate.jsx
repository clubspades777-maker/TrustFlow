import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, Upload, Loader2 } from "lucide-react";

const CATEGORIES = ["medical", "education", "emergency", "livelihood", "other"];
const STATES = ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal", "Kerala", "Uttar Pradesh", "Rajasthan", "Gujarat", "Bihar", "Other"];

export default function FundraiserCreate() {
  const [form, setForm] = useState({ title: "", description: "", beneficiary_name: "", beneficiary_story: "", category: "medical", goal_amount: "", creator_name: "", creator_email: "", city: "", state: "Delhi", deadline: "", lat: "", lng: "" });
  const [docUrl, setDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setDocUrl(file_url);
    } catch (e) { setError("Upload failed"); }
    setUploading(false);
  };

  const submit = async () => {
    setError("");
    if (!form.title || !form.beneficiary_name || !form.goal_amount || !form.creator_email) {
      setError("Title, beneficiary name, goal amount and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.entities.Fundraiser.create({
        ...form,
        goal_amount: Number(form.goal_amount),
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        raised_amount: 0,
        status: "active",
        medical_document_url: docUrl || undefined,
      });
      navigate(`/fundraisers/${res.id}`);
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    setSubmitting(false);
  };

  if (done) return null;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><Heart className="w-6 h-6 text-emerald-600" /> Start a fundraiser</h1>
      <p className="text-sm text-emerald-700 mt-1">For verified personal emergencies. Upload supporting documents (e.g. medical estimate) for transparency.</p>

      <Card className="p-6 border-emerald-100 mt-6 space-y-4">
        <Field label="Title *"><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Help Ravi fight cancer" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Beneficiary name *"><Input value={form.beneficiary_name} onChange={(e) => set("beneficiary_name", e.target.value)} /></Field>
          <Field label="Category"><select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></Field>
        </div>
        <Field label="Beneficiary story"><Textarea value={form.beneficiary_story} onChange={(e) => set("beneficiary_story", e.target.value)} rows={3} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Goal amount (₹) *"><Input type="number" value={form.goal_amount} onChange={(e) => set("goal_amount", e.target.value)} /></Field>
          <Field label="Deadline"><Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Your name"><Input value={form.creator_name} onChange={(e) => set("creator_name", e.target.value)} /></Field>
          <Field label="Your email *"><Input type="email" value={form.creator_email} onChange={(e) => set("creator_email", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="State"><select value={form.state} onChange={(e) => set("state", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Lat"><Input type="number" value={form.lat} onChange={(e) => set("lat", e.target.value)} /></Field>
            <Field label="Lng"><Input type="number" value={form.lng} onChange={(e) => set("lng", e.target.value)} /></Field>
          </div>
        </div>
        <div>
          <Label className="text-green-900 text-xs">Supporting document (medical estimate, etc.)</Label>
          <div className="mt-1 flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
              <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} accept="image/*,application/pdf" />
            </label>
            {docUrl && <span className="text-xs text-emerald-600 truncate">✓ uploaded</span>}
          </div>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        <div className="flex gap-3 pt-2">
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create fundraiser"}</Button>
          <Button variant="outline" onClick={() => navigate("/fundraisers")} className="border-emerald-300 text-emerald-700">Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return <div><Label className="text-green-900 text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}