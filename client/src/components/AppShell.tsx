// Archive of Trust: the shell is the institutional spine—compact, warm, and always explicit about the next action.
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, BookOpenCheck, BriefcaseBusiness, ChevronDown, FileText, Landmark, LogOut, Menu, Moon, Search, Settings2, ShieldCheck, Sparkles, Sun, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockAssets, mockNotifications, mockRegulators, mockUser } from "@/data/mockData";
import { Brand } from "@/components/Brand";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import type { Asset, RegulatorId } from "@/types";

const navItems = [
  { href: "/home", label: "Home", icon: Landmark },
  { href: "/claims", label: "Claims", icon: BookOpenCheck },
  { href: "/fintwin", label: "FinTwin", icon: BriefcaseBusiness },
  { href: "/documents", label: "Documents", icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [claimPickerOpen, setClaimPickerOpen] = useState(false);
  const [selectedRegulator, setSelectedRegulator] = useState<RegulatorId>("rbi");
  const [darkMode, setDarkMode] = useState(false);
  const [startingClaim, setStartingClaim] = useState(false);

  const currentLabel = useMemo(() => {
    if (location.startsWith("/regulator")) return "Regulator details";
    if (location.startsWith("/claims/")) return "Claim assist";
    return navItems.find((item) => item.href === location)?.label ?? "Workspace";
  }, [location]);

  // Real backend wiring: when VITE_USE_BACKEND=true, "Start new claim" pulls
  // the signed-in user's real discovered assets and opens a real claim record
  // via claims.create, so the picker and the claim it produces are genuine —
  // not just a click that always lands on the same five hardcoded demo claims.
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  // Real backend mode actually requires being signed in — redirect to /login
  // if there's no valid session. In mock mode (the default demo experience)
  // this is a no-op: nothing here is gated.
  const { user: realUser, logout } = useAuth({ redirectOnUnauthenticated: backendEnabled, redirectPath: "/login" });
  const displayName = (backendEnabled && realUser?.name) ? realUser.name : mockUser.name;
  const displayInitials = displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || mockUser.avatar;
  const assetsQuery = trpc.assets.list.useQuery(undefined, { enabled: backendEnabled, retry: false });
  const createClaimMutation = trpc.claims.create.useMutation();

  const realAssets: (Asset & { realId: number })[] | undefined = assetsQuery.data?.map((asset) => ({
    id: String(asset.id),
    realId: asset.id,
    regulatorId: asset.regulator.toLowerCase() as RegulatorId,
    type: asset.type as Asset["type"],
    provider: asset.provider,
    maskedNumber: asset.accountNumberMasked,
    amount: asset.amount,
    lastActivity: new Date(asset.discoveredDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    status: asset.status as Asset["status"],
    nominee: asset.nomineeName ?? "Not Found",
  }));

  const availableAssets = (realAssets ?? mockAssets).filter((asset) => asset.regulatorId === selectedRegulator);

  const startClaim = async (assetId: string) => {
    // Real path: this asset came from the live backend, so open a real claim.
    const realAsset = realAssets?.find((asset) => asset.id === assetId);
    if (backendEnabled && realAsset) {
      setStartingClaim(true);
      try {
        const claim = await createClaimMutation.mutateAsync({ assetId: realAsset.realId });
        setClaimPickerOpen(false);
        navigate(`/claims/${claim.id}/assist`);
        return;
      } catch (error) {
        console.error("[Claims] Failed to create a real claim, falling back to the mock flow:", error);
        // fall through to the mock flow below rather than leaving the user stuck
      } finally {
        setStartingClaim(false);
      }
    }
    // Mock/demo path (also the fallback if the real call above failed).
    const claim = assetId === "asset_rbi_01" ? "claim_rbi_01" : assetId === "asset_epfo_01" ? "claim_epfo_01" : assetId === "asset_lic_01" ? "claim_lic_01" : "claim_rbi_02";
    setClaimPickerOpen(false);
    navigate(`/claims/${claim}/assist`);
  };

  return (
    <div className={darkMode ? "dark app-root" : "app-root"}>
      <aside className={`app-sidebar ${drawerOpen ? "app-sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand light />
          <button className="sidebar-close md:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="sidebar-kicker">Your financial record</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = item.href === "/home" ? location === "/home" || location === "/" : location.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{active && <span className="active-rule" />}</Link>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <div><p>Protected workspace</p><span>Mock environment · v0.8</span></div>
        </div>
        <Link href="/profile" className={`sidebar-link ${location === "/profile" ? "sidebar-link-active" : ""}`}><Settings2 size={18} strokeWidth={1.8} /><span>Profile & settings</span></Link>
        <button className="sidebar-link sidebar-logout" onClick={async () => { if (backendEnabled) { await logout(); navigate("/login"); } else { toast("You are still in the Virasat demo"); } }}><LogOut size={18} strokeWidth={1.8} /><span>Sign out</span></button>
        <div className="sidebar-footer">VIRASAT / 2026</div>
      </aside>

      {drawerOpen && <button className="drawer-scrim md:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" />}

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left"><button className="menu-trigger md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={21} /></button><span className="topbar-context">{currentLabel}</span></div>
          <div className="topbar-actions">
            <div className="topbar-search hidden lg:flex"><Search size={15} /><Input aria-label="Search financial assets" placeholder="Search assets or claims" /></div>
            <button className="icon-button theme-button" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="notification-wrap">
              <button className={`icon-button ${notificationsOpen ? "icon-button-active" : ""}`} onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open notifications" aria-expanded={notificationsOpen}><Bell size={18} />{mockNotifications.some((note) => note.unread) && <span className="notification-dot" />}</button>
              {notificationsOpen && <div className="notification-popover">
                <div className="popover-heading"><div><p className="popover-kicker">Recent activity</p><h3>Notifications</h3></div><span className="unread-count">2 new</span></div>
                <div className="notification-list">{mockNotifications.map((note) => <button key={note.id} className="notification-item" onClick={() => { setNotificationsOpen(false); if (note.claimId) navigate(`/claims/${note.claimId}/assist`); }}><span className={`notification-icon note-${note.tone}`}>{note.tone === "success" ? "✓" : note.tone === "warning" ? "!" : note.tone === "security" ? "•" : "i"}</span><span className="notification-copy"><strong>{note.title}</strong><span>{note.detail}</span><small>{note.time}</small></span>{note.unread && <span className="notification-unread" />}</button>)}</div>
                <div className="popover-footer"><Link href="/claims" onClick={() => setNotificationsOpen(false)}>View all claim activity <ChevronDown size={14} className="rotate-[-90deg]" /></Link></div>
              </div>}
            </div>
            <button className="profile-chip" onClick={() => navigate("/profile")}><span className="avatar avatar-small">{displayInitials}</span><span className="hidden sm:inline">{displayName.split(" ")[0]}</span><ChevronDown size={14} className="hidden sm:block" /></button>
          </div>
        </header>
        <div className="main-scroll">{children}</div>
      </main>

      {claimPickerOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClaimPickerOpen(false); }}>
        <section className="claim-picker" role="dialog" aria-modal="true" aria-labelledby="claim-picker-title">
          <div className="picker-top"><div><div className="eyebrow"><span className="eyebrow-mark" />Start a claim</div><h2 id="claim-picker-title">Which record should we prepare?</h2><p>Choose a connected institution, then select an asset to open Claim Assist.</p></div><button className="icon-button" onClick={() => setClaimPickerOpen(false)} aria-label="Close dialog"><X size={18} /></button></div>
          <div className="picker-tabs" role="tablist" aria-label="Select a regulator">{mockRegulators.map((regulator) => <button key={regulator.id} className={`picker-tab ${selectedRegulator === regulator.id ? "picker-tab-active" : ""}`} onClick={() => setSelectedRegulator(regulator.id)} role="tab" aria-selected={selectedRegulator === regulator.id}><span className="mini-regulator" style={{ background: regulator.accent }}>{regulator.icon.slice(0, 2)}</span><span>{regulator.shortName}</span></button>)}</div>
          <div className="picker-assets">{availableAssets.map((asset) => <button key={asset.id} className="picker-asset" disabled={startingClaim} onClick={() => startClaim(asset.id)}><span><small>{asset.type}</small><strong>{asset.provider}</strong><em>{asset.maskedNumber}</em></span><span className="picker-asset-right"><b>₹{asset.amount.toLocaleString("en-IN")}</b><span>{startingClaim ? "Starting…" : "Start assist"} <ChevronDown size={14} className="rotate-[-90deg]" /></span></span></button>)}</div>
          <div className="picker-disclaimer"><ShieldCheck size={17} /><span>This is a prototype connection. Virasat prepares and verifies documents; you submit the claim.</span></div>
        </section>
      </div>}
      <button className="global-claim-button" onClick={() => setClaimPickerOpen(true)}><Sparkles size={16} /> <span className="hidden sm:inline">Start new claim</span><span className="sm:hidden">New claim</span></button>
    </div>
  );
}
