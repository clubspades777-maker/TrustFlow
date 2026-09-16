import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NeedsMap from "@/components/NeedsMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import AnimatedCounter from "@/components/AnimatedCounter";
import { ShieldCheck, Heart, TrendingUp, AlertTriangle, ArrowRight, MapPin, Users, HandCoins, Sparkles, Eye, FileCheck2 } from "lucide-react";

const HERO_IMG = "https://media.base44.com/images/public/6aaa2305689140c65fcd0979/4482fd2a9_generated_image.png";
const IMPACT_IMG = "https://media.base44.com/images/public/6aaa2305689140c65fcd0979/d8134f8ce_generated_image.png";

export default function Home() {
  const [ngos, setNgos] = useState([]);
  const [fundraisers, setFundraisers] = useState([]);
  const [stats, setStats] = useState({ raised: 0, verified: 0, donors: 0, held: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.NGO.filter({ status: "verified" }, "-total_raised", 50),
      base44.entities.Fundraiser.filter({ status: "active" }, "-raised_amount", 30),
      base44.entities.Donation.list("-created_date", 100),
    ]).then(([n, f, d]) => {
      setNgos(n);
      setFundraisers(f);
      const raised = d.reduce((s, x) => s + (x.status === "completed" ? x.amount : 0), 0);
      setStats({
        raised,
        verified: n.length,
        donors: new Set(d.map((x) => x.donor_email).filter(Boolean)).size,
        held: d.filter((x) => x.status === "held_for_review").length,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const mapItems = [
    ...ngos.map((n) => ({ id: n.id, name: n.name, lat: n.lat, lng: n.lng, city: n.city, state: n.state, needs_level: n.needs_level })),
    ...fundraisers.map((f) => ({ id: f.id, name: f.title, lat: f.lat, lng: f.lng, city: f.city, state: f.state, needs_level: "high" })),
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden m-4 md:m-6 shadow-xl shadow-emerald-900/20">
        <div className="absolute inset-0">
          <Image src={HERO_IMG} alt="Community volunteers" fittingType="fill" className="w-full h-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-green-800/80 to-green-950/90" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative p-8 md:p-16 text-white min-h-[420px] flex flex-col justify-center max-w-2xl">
          <div className="inline-flex w-fit items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" /> Verified NGOs · Fraud-aware · Transparent utilization
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight drop-shadow-sm">Give where it's needed, see where it goes.</h1>
          <p className="mt-4 text-emerald-50 text-lg leading-relaxed">ClearGives connects donors with verified NGOs and individuals across India. Every rupee is tracked from donation to utilization — with built-in safeguards against fraud and money laundering.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/ngos"><Button className="bg-white text-emerald-800 hover:bg-emerald-50 shadow-lg shadow-emerald-900/30">Explore NGOs <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
            <Link to="/apply"><Button variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 backdrop-blur-sm">Register your NGO</Button></Link>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-10">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={HandCoins} label="Funds released" value={<AnimatedCounter prefix="₹" value={stats.raised} />} color="emerald" />
        <StatCard icon={ShieldCheck} label="Verified NGOs" value={<AnimatedCounter value={stats.verified} />} color="green" />
        <StatCard icon={Users} label="Unique donors" value={<AnimatedCounter value={stats.donors} />} color="emerald" />
        <StatCard icon={AlertTriangle} label="Held for review" value={<AnimatedCounter value={stats.held} />} color="amber" />
      </div>

      {/* How it works — visual section */}
      <div className="mt-12 rounded-3xl overflow-hidden border border-emerald-100 shadow-lg shadow-emerald-900/5 grid md:grid-cols-2">
        <div className="relative min-h-[260px]">
          <Image src={IMPACT_IMG} alt="Impact on the ground" fittingType="fill" className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 md:to-white/30" />
        </div>
        <div className="p-8 md:p-10 bg-white flex flex-col justify-center">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">How ClearGives works</span>
          <h2 className="text-2xl font-bold text-green-900 mb-6">Trust, built into every rupee.</h2>
          <div className="space-y-5">
            <Step icon={ShieldCheck} n="1" title="Verified onboarding" desc="NGOs submit PAN, Darpan, 12A/12AB, FCRA and bank details — admins verify before a single rupee flows." />
            <Step icon={HandCoins} n="2" title="Fraud-aware donations" desc="Risk scoring checks velocity, device overlap & spikes in real time. Suspicious gifts are held for review." />
            <Step icon={FileCheck2} n="3" title="Transparent utilization" desc="Invoices, utilization certificates & CA audits are uploaded and linked to every expense." />
          </div>
        </div>
      </div>

      {/* Needs heatmap */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-green-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> Needs heatmap</h2>
            <p className="text-sm text-emerald-700">Underserved areas in red & orange — direct your support where it matters most.</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-emerald-100 shadow-md shadow-emerald-900/5">
          <NeedsMap items={mapItems} height="440px" />
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          {[["critical", "Critical need"], ["high", "High need"], ["medium", "Moderate"], ["low", "Stable"]].map(([k, l]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: { critical: "#dc2626", high: "#ea580c", medium: "#16a34a", low: "#65a30d" }[k] }} />
              <span className="text-green-800">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured NGOs */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-green-900">Verified NGOs near you</h2>
          <Link to="/ngos" className="text-sm text-emerald-600 font-medium hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="text-emerald-600 text-sm">Loading…</div>
        ) : ngos.length === 0 ? (
          <Card className="p-8 text-center text-emerald-700 border-emerald-200">No verified NGOs yet. NGOs appear here once admins verify their compliance documents.</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ngos.slice(0, 6).map((ngo) => (
              <Link key={ngo.id} to={`/ngos/${ngo.id}`}>
                <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all border-emerald-100 h-full flex flex-col">
                  <div className="h-24 bg-gradient-to-br from-emerald-500 via-green-600 to-green-800 relative">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                    <div className="absolute -bottom-6 left-5 w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center text-emerald-700 font-bold text-lg border border-emerald-100">{ngo.name?.[0]}</div>
                  </div>
                  <div className="p-5 pt-8 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-green-900">{ngo.name}</h3>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0"><ShieldCheck className="w-3 h-3" /> Verified</span>
                    </div>
                    <p className="text-xs text-emerald-600 mt-0.5">{ngo.city}, {ngo.state} · {ngo.category}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2 flex-1">{ngo.description || ngo.beneficiary_summary || "Transparent utilization reporting."}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-medium">₹{(ngo.total_raised || 0).toLocaleString("en-IN")} raised</span>
                      <span className="text-emerald-600 flex items-center gap-1">View <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Individual fundraisers */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-green-900 flex items-center gap-2"><Heart className="w-5 h-5 text-emerald-600" /> Individual fundraisers</h2>
          <Link to="/fundraisers/create" className="text-sm text-emerald-600 font-medium hover:underline">Start a fundraiser →</Link>
        </div>
        {fundraisers.length === 0 ? (
          <Card className="p-8 text-center text-emerald-700 border-emerald-200">No active fundraisers. Anyone can raise funds for a verified personal emergency.</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fundraisers.slice(0, 4).map((f) => {
              const pct = f.goal_amount ? Math.min(100, Math.round((f.raised_amount / f.goal_amount) * 100)) : 0;
              return (
                <Link key={f.id} to={`/fundraisers/${f.id}`}>
                  <Card className="p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all border-emerald-100 h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center"><Heart className="w-4 h-4 text-rose-500" /></div>
                      <span className="text-xs text-emerald-600 font-medium">{f.category}</span>
                    </div>
                    <h3 className="font-semibold text-green-900 text-sm">{f.title}</h3>
                    <p className="text-xs text-emerald-600 mt-0.5">{f.beneficiary_name} · {f.city}</p>
                    <div className="mt-3 h-2 bg-emerald-50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all" style={{ width: `${pct}%` }} />
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

      {/* Trust ribbon */}
      <div className="mt-12 rounded-3xl bg-gradient-to-br from-green-900 via-emerald-900 to-green-950 text-white p-8 md:p-10 grid md:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 50%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <TrustItem icon={ShieldCheck} title="Verified compliance" desc="PAN, Darpan, 12A/12AB, FCRA, bank-name match checked before any NGO can receive funds." />
        <TrustItem icon={Eye} title="Granular utilization" desc="Invoices, utilization certificates & CA audit docs attached to every project expense." />
        <TrustItem icon={AlertTriangle} title="Risk-aware flow" desc="Velocity bursts, device overlap & spikes are held for manual review — no auto-release of large sums." />
      </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = { emerald: "from-emerald-50 to-white text-emerald-700 border-emerald-100", green: "from-green-50 to-white text-green-700 border-green-100", amber: "from-amber-50 to-white text-amber-700 border-amber-100" };
  return (
    <Card className={`p-5 border bg-gradient-to-br ${colorMap[color]} hover:shadow-md transition-shadow`}>
      <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center mb-3 shadow-sm"><Icon className="w-5 h-5" /></div>
      <div className="text-2xl font-bold text-green-900">{value}</div>
      <div className="text-xs text-emerald-600 font-medium mt-0.5">{label}</div>
    </Card>
  );
}

function Step({ icon: Icon, n, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700"><Icon className="w-4 h-4" /></div>
      <div>
        <h3 className="font-semibold text-green-900 text-sm">{title}</h3>
        <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function TrustItem({ icon: Icon, title, desc }) {
  return (
    <div className="relative">
      <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 border border-white/10">
        <Icon className="w-5 h-5 text-emerald-300" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-emerald-100">{desc}</p>
    </div>
  );
}