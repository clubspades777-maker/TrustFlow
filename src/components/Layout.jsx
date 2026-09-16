import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Heart, MapPin, LayoutDashboard, ShieldCheck, Users, FileText, LogOut, Leaf, HandCoins, ShieldAlert } from "lucide-react";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", label: "Discover", icon: MapPin },
    { to: "/ngos", label: "NGO Directory", icon: Users },
    { to: "/fundraisers", label: "Fundraisers", icon: Heart },
    { to: "/apply", label: "NGO Onboarding", icon: ShieldCheck },
    { to: "/donor", label: "My Donations", icon: HandCoins },
    { to: "/admin", label: "Risk Review", icon: LayoutDashboard },
    { to: "/risk", label: "Risk & Suspicious Activity", icon: ShieldAlert },
  ];

  const isActive = (path) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-emerald-50/40 flex">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-emerald-100 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-emerald-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-green-900 leading-tight">ClearGives</div>
              <div className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Transparent Giving</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-emerald-600 text-white" : "text-green-800 hover:bg-emerald-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-emerald-100">
          {!loading && user ? (
            <div className="px-2">
              <div className="text-xs text-emerald-700 font-medium truncate">{user.email}</div>
              <div className="text-[10px] text-emerald-500 mb-2 capitalize">{user.role}</div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 font-medium">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="block px-2 text-xs text-emerald-600 font-medium">Sign in</Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-emerald-100 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-green-900">ClearGives</span>
        </Link>
        <select
          onChange={(e) => navigate(e.target.value)}
          value={location.pathname}
          className="text-sm border border-emerald-200 rounded-lg px-2 py-1 bg-white text-green-800"
        >
          {navItems.map((i) => <option key={i.to} value={i.to}>{i.label}</option>)}
        </select>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}