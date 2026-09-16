import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VerificationBadge from "@/components/VerificationBadge";
import NeedsMap from "@/components/NeedsMap";
import { Search, ShieldCheck, MapPin, Filter, ArrowRight } from "lucide-react";

const CATEGORIES = ["all", "education", "health", "environment", "women_children", "elderly", "disaster_relief", "animal_welfare", "livelihood", "other"];
const STATES = ["all", "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal", "Kerala", "Uttar Pradesh", "Rajasthan", "Gujarat", "Bihar", "Assam"];

export default function NGODirectory() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState("all");
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [nearMe, setNearMe] = useState(false);
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    base44.entities.NGO.list("-created_date", 200).then((n) => { setNgos(n); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return ngos.filter((n) => {
      if (onlyVerified && n.status !== "verified") return false;
      if (category !== "all" && n.category !== category) return false;
      if (state !== "all" && n.state !== state) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!(`${n.name} ${n.city} ${n.description}`.toLowerCase().includes(s))) return false;
      }
      if (nearMe && userPos && n.lat && n.lng) {
        const d = Math.sqrt((n.lat - userPos.lat) ** 2 + (n.lng - userPos.lng) ** 2);
        if (d > 5) return false;
      }
      return true;
    });
  }, [ngos, q, category, state, onlyVerified, nearMe, userPos]);

  const findNearMe = () => {
    if (!navigator.geolocation) return;
    setNearMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setNearMe(false)
    );
  };

  const mapItems = filtered.map((n) => ({ id: n.id, name: n.name, lat: n.lat, lng: n.lng, city: n.city, state: n.state, needs_level: n.needs_level }));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-900">NGO Directory</h1>
          <p className="text-sm text-emerald-700">Discover verified NGOs and direct funds to underserved areas.</p>
        </div>
        <Button onClick={findNearMe} variant="outline" className="border-emerald-300 text-emerald-700">
          <MapPin className="w-4 h-4 mr-1" /> NGOs near me
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card className="p-4 border-emerald-100">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city…" className="pl-9" />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c.replace("_", " ")}</option>)}
              </select>
              <select value={state} onChange={(e) => setState(e.target.value)} className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white text-green-800">
                {STATES.map((s) => <option key={s} value={s}>{s === "all" ? "All states" : s}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-green-800">
                <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} className="accent-emerald-600" /> Verified only
              </label>
            </div>
          </Card>

          {loading ? (
            <div className="text-emerald-600 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-emerald-700 border-emerald-100">No NGOs match your filters.</Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((ngo) => (
                <Link key={ngo.id} to={`/ngos/${ngo.id}`}>
                  <Card className="p-5 hover:shadow-md transition-shadow border-emerald-100 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">{ngo.name?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-green-900">{ngo.name}</h3>
                        <VerificationBadge status={ngo.status} />
                      </div>
                      <p className="text-xs text-emerald-600 mt-0.5">{ngo.city}, {ngo.state} · {ngo.category.replace("_", " ")}</p>
                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{ngo.description || "—"}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-emerald-700">
                        <span>₹{(ngo.total_raised || 0).toLocaleString("en-IN")} raised</span>
                        <span>₹{(ngo.total_utilized || 0).toLocaleString("en-IN")} utilized</span>
                        {ngo.needs_level === "critical" && <span className="text-red-600 font-medium">Critical need</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-1.5"><Filter className="w-4 h-4 text-emerald-600" /> Needs map</h3>
            <NeedsMap items={mapItems} height="320px" zoom={4} />
          </div>
          <Card className="p-4 border-emerald-100 bg-emerald-50/50">
            <div className="text-sm text-emerald-800">
              <div className="font-semibold mb-1">Why verification matters</div>
              <p className="text-xs text-emerald-700">Only NGOs with PAN, Darpan, 12A/12AB, FCRA (if foreign funds) and a bank account matching the registered entity name can receive donations.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}