import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Building2, CreditCard, FileText, CheckCircle2, AlertTriangle, Upload, Loader2 } from "lucide-react";

const CATEGORIES = ["education", "health", "environment", "women_children", "elderly", "disaster_relief", "animal_welfare", "livelihood", "other"];
const STATES = ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal", "Kerala", "Uttar Pradesh", "Rajasthan", "Gujarat", "Bihar", "Assam", "Other"];

const empty = {
  name: "", description: "", category: "education",
  registration_number: "", pan: "", darpan_id: "", twelve_a: "12A", twelve_a_number: "", ftr: "not_applicable", ftr_number: "", atg: "",
  registered_address: "", city: "", state: "Delhi", pincode: "", lat: "", lng: "",
  authorized_representative_name: "", authorized_representative_designation: "", authorized_representative_email: "", authorized_representative_phone: "",
  bank_account_name: "", bank_account_number: "", bank_ifsc: "", bank_name: "",
  goal_amount: "", beneficiary_summary: "", needs_level: "medium",
};

const DOC_FIELDS = [
  { key: "registration", label: "NGO Registration Certificate" },
  { key: "pan", label: "PAN Card" },
  { key: "darpan", label: "Darpan Certificate" },
  { key: "twelve_a", label: "12A / 12AB Certificate" },
  { key: "ftr", label: "FCRA Certificate (if foreign donations)" },
  { key: "address", label: "Address Proof" },
  { key: "bank", label: "Bank Cancelled Cheque / Proof" },
];

export default function Apply() {
  const [form, setForm] = useState(empty);
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (key, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setDocs((d) => ({ ...d, [key]: { label: DOC_FIELDS.find((x) => x.key === key)?.label || key, url: file_url } }));
    } catch (e) {
      setError("File upload failed: " + (e.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const bankMatch = form.name && form.bank_account_name &&
    form.name.toLowerCase().replace(/\s/g, "") === form.bank_account_name.toLowerCase().replace(/\s/g, "");

  const submit = async () => {
    setError("");
    if (!form.name || !form.registered_address || !form.pan || !form.darpan_id) {
      setError("Please fill name, registered address, PAN and Darpan ID at minimum.");
      return;
    }
    setSubmitting(true);
    try {
      const documents = Object.values(docs);
      await base44.entities.NGO.create({
        ...form,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        goal_amount: form.goal_amount ? Number(form.goal_amount) : undefined,
        status: "pending_verification",
        documents,
      });
      setDone(true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-emerald-600" /></div>
        <h1 className="text-2xl font-bold text-green-900 mt-4">Application submitted</h1>
        <p className="text-emerald-700 mt-2">Your NGO is now <strong>pending verification</strong>. Our risk reviewers will check your compliance documents and bank-name match before approving you to receive donations. You'll be notified once verified.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Button onClick={() => navigate("/")} className="bg-emerald-600 hover:bg-emerald-700">Back home</Button>
          <Button variant="outline" onClick={() => { setForm(empty); setDocs({}); setDone(false); }} className="border-emerald-300 text-emerald-700">Register another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-emerald-600" /> NGO Onboarding & Verification</h1>
      <p className="text-sm text-emerald-700 mt-1">Submit compliance documents for admin review. Only verified NGOs can receive donations.</p>

      {/* Identity */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-emerald-600" /> Organization</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="NGO name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Category"><select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Field></div>
          <Field label="Registration number *"><Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} /></Field>
          <Field label="PAN *"><Input value={form.pan} onChange={(e) => set("pan", e.target.value)} /></Field>
          <Field label="Darpan ID *"><Input value={form.darpan_id} onChange={(e) => set("darpan_id", e.target.value)} /></Field>
          <Field label="ATG (if any)"><Input value={form.atg} onChange={(e) => set("atg", e.target.value)} /></Field>
          <Field label="12A / 12AB">
            <select value={form.twelve_a} onChange={(e) => set("twelve_a", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
              <option value="12A">12A</option><option value="12AB">12AB</option><option value="none">None</option>
            </select>
          </Field>
          <Field label="12A/12AB number"><Input value={form.twelve_a_number} onChange={(e) => set("twelve_a_number", e.target.value)} /></Field>
          <Field label="FCRA (FTR)">
            <select value={form.ftr} onChange={(e) => set("ftr", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
              <option value="not_applicable">Not applicable</option><option value="FCRA_active">FCRA Active</option><option value="FCRA_pending">FCRA Pending</option>
            </select>
          </Field>
          <Field label="FCRA number"><Input value={form.ftr_number} onChange={(e) => set("ftr_number", e.target.value)} /></Field>
        </div>
      </Card>

      {/* Address */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 mb-4">Registered address & location</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Field label="Registered address *"><Textarea value={form.registered_address} onChange={(e) => set("registered_address", e.target.value)} rows={2} /></Field></div>
          <Field label="City *"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="State"><select value={form.state} onChange={(e) => set("state", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></Field>
          <Field label="Pincode"><Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude (for map)"><Input type="number" value={form.lat} onChange={(e) => set("lat", e.target.value)} placeholder="28.61" /></Field>
            <Field label="Longitude"><Input type="number" value={form.lng} onChange={(e) => set("lng", e.target.value)} placeholder="77.20" /></Field>
          </div>
          <Field label="Need level"><select value={form.needs_level} onChange={(e) => set("needs_level", e.target.value)} className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800 h-9">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select></Field>
          <div className="md:col-span-2"><Field label="Beneficiary summary"><Textarea value={form.beneficiary_summary} onChange={(e) => set("beneficiary_summary", e.target.value)} rows={2} /></Field></div>
        </div>
      </Card>

      {/* Representative */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 mb-4">Authorized representative</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Name"><Input value={form.authorized_representative_name} onChange={(e) => set("authorized_representative_name", e.target.value)} /></Field>
          <Field label="Designation"><Input value={form.authorized_representative_designation} onChange={(e) => set("authorized_representative_designation", e.target.value)} /></Field>
          <Field label="Email"><Input value={form.authorized_representative_email} onChange={(e) => set("authorized_representative_email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.authorized_representative_phone} onChange={(e) => set("authorized_representative_phone", e.target.value)} /></Field>
        </div>
      </Card>

      {/* Bank */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-4"><CreditCard className="w-5 h-5 text-emerald-600" /> Bank account</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Account name (must match NGO name)"><Input value={form.bank_account_name} onChange={(e) => set("bank_account_name", e.target.value)} /></Field>
          <Field label="Account number"><Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} /></Field>
          <Field label="IFSC"><Input value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value)} /></Field>
          <Field label="Bank name"><Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
        </div>
        {form.name && form.bank_account_name && (
          bankMatch ? (
            <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Bank account name matches the NGO entity name.</div>
          ) : (
            <div className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Bank account name does not match the NGO name. This will be flagged during verification.</div>
          )
        )}
      </Card>

      {/* Documents */}
      <Card className="p-6 border-emerald-100 mt-6">
        <h2 className="font-semibold text-green-900 flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-emerald-600" /> Compliance documents</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {DOC_FIELDS.map((d) => (
            <div key={d.key} className="flex items-center justify-between p-3 border border-emerald-100 rounded-lg">
              <div className="min-w-0">
                <div className="text-sm font-medium text-green-900">{d.label}</div>
                {docs[d.key] ? <div className="text-xs text-emerald-600 truncate">✓ {docs[d.key].url}</div> : <div className="text-xs text-gray-400">Not uploaded</div>}
              </div>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={(e) => handleFile(d.key, e.target.files?.[0])} accept="image/*,application/pdf" />
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {docs[d.key] ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      <div className="mt-6 flex gap-3">
        <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for verification"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/")} className="border-emerald-300 text-emerald-700">Cancel</Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-green-900 text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}