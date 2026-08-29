// Archive of Trust: the dashboard is the “wow” screen—an editorial overview of fragmented financial records made legible.
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronRight, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MockDataService } from "@/services/dataService";
import { mockUser } from "@/data/mockData";
import { trpc } from "@/lib/trpc";
import { SectionEyebrow, StatusBadge } from "@/components/StatusBadge";
import type { Claim, Regulator, RegulatorId } from "@/types";

const formatAmount = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const formatShort = (amount: number) => amount >= 100000 ? `₹${(amount / 100000).toFixed(2)}L` : formatAmount(amount);

export default function Dashboard() {
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  const dashboardQuery = trpc.dashboard.snapshot.useQuery(undefined, { enabled: backendEnabled, retry: false });
  useEffect(() => { MockDataService.getRegulators().then(setRegulators); MockDataService.getClaims().then(setClaims); }, []);
  const apiSnapshot = dashboardQuery.data;
  const resolvedRegulators = regulators.map((regulator) => {
    const summary = apiSnapshot?.regulators.find((item) => item.regulator.toLowerCase() === regulator.id);
    return summary ? { ...regulator, assetCount: summary.assetCount, totalAmount: summary.totalValue, status: summary.status as Regulator["status"] } : regulator;
  });
  const apiStatusToUi: Record<string, Claim["status"]> = { NOT_STARTED: "Not Started", IN_PROGRESS: "In Progress", DOCUMENTS_PENDING: "Documents Pending", AI_VERIFICATION: "AI Verification", READY_TO_SUBMIT: "Ready to Submit", SUBMITTED: "Submitted", CLAIMED: "Claimed", REJECTED: "Rejected" };
  const apiClaims: Claim[] | undefined = apiSnapshot?.claimActivity.map((claim) => ({ ...claim, id: String(claim.id), assetId: String(claim.id), regulatorId: claim.regulatorId as RegulatorId, status: apiStatusToUi[claim.status] ?? "In Progress", lastUpdated: new Date(claim.lastUpdated).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }));
  const resolvedClaims = apiClaims ?? claims;
  const firstName = apiSnapshot?.user.name?.split(" ")[0] ?? mockUser.name.split(" ")[0];
  const totalAssets = apiSnapshot?.totalAssets ?? 12;
  const claimedValue = apiSnapshot?.claimedValue ?? 1842000;
  const pendingClaims = apiSnapshot?.pendingClaims ?? 3;
  const unclaimedValue = apiSnapshot?.unclaimedValue ?? 4872000;

  return <div className="page-wrap">
    <section className="dashboard-hero animate-in">
      <div className="hero-content">
        <div className="hero-kicker"><span />Your financial continuity record</div>
        <h1 className="hero-title">Your financial life,<br /><em>finally in one place.</em></h1>
        <p className="hero-copy">Welcome back, {firstName}. One calm view of the records connected to your family—what has been found, what needs attention, and what you can prepare next.</p>
      </div>
      <div className="hero-aside"><div className="hero-aside-note"><ShieldCheck size={14} /> Private by design</div><div className="hero-amount"><span>Discovered value</span><strong>{formatShort(unclaimedValue)}</strong></div><Button className="btn-brass" onClick={() => document.querySelector<HTMLButtonElement>(".global-claim-button")?.click()}>Start new claim <ArrowUpRight size={15} /></Button></div>
    </section>

    <section className="stat-strip animate-in delay-1" aria-label="Financial summary">
      <div className="stat-item"><span className="stat-label">Total assets found</span><p className="stat-value">{totalAssets}</p><span className="stat-note"><strong>Across 5</strong> institutions</span></div>
      <div className="stat-item"><span className="stat-label">Total claimed value</span><p className="stat-value">{formatShort(claimedValue)}</p><span className="stat-note"><strong>3 records</strong> completed</span></div>
      <div className="stat-item"><span className="stat-label">Pending claims</span><p className="stat-value">{pendingClaims}</p><span className="stat-note"><strong>2 need documents</strong></span></div>
      <div className="stat-item"><span className="stat-label">Total unclaimed value</span><p className="stat-value">{formatShort(unclaimedValue)}</p><span className="stat-note"><strong>₹12.74L</strong> at RBI</span></div>
    </section>

    <div className="section-row animate-in delay-2"><div><SectionEyebrow>Fragmented, now visible</SectionEyebrow><h2 className="section-title">Your institutions</h2></div><span className="section-meta">12 assets discovered</span></div>
    <section className="regulator-grid animate-in delay-2">
      {resolvedRegulators.map((regulator) => <motion.article key={regulator.id} className="regulator-card" style={{ "--reg-accent": regulator.accent } as React.CSSProperties} whileHover={{ y: -3 }}>
        <div><div className="regulator-top"><span className="regulator-icon">{regulator.icon}</span><StatusBadge status={regulator.status} size="small" /></div><h3>{regulator.shortName}</h3><p className="regulator-desc">{regulator.description}</p></div>
        <div><p className="regulator-value">{formatShort(regulator.totalAmount)}</p><span className="regulator-assets">{regulator.assetCount} assets found</span><div className="regulator-footer"><Link className="regulator-link" href={`/regulator/${regulator.id}`}>View details <ChevronRight size={13} /></Link><span className="table-muted">{regulator.category}</span></div></div>
      </motion.article>)}
    </section>

    <div className="section-row animate-in delay-3"><div><SectionEyebrow>Keep the thread</SectionEyebrow><h2 className="section-title">Claim activity</h2></div><Link className="text-button" href="/claims">Open tracker <ArrowUpRight size={14} /></Link></div>
    <section className="activity-grid animate-in delay-3">
      <div className="panel"><div className="panel-header"><div><h3>In motion</h3><p>Your most recent claim work, in one place.</p></div><FileCheck2 size={20} color="#B78A4A" /></div><div className="claim-list">{resolvedClaims.slice(0, 3).map((claim) => <Link key={claim.id} href={`/claims/${claim.id}/assist`} className="claim-row"><span className="claim-row-icon">{claim.regulatorId.toUpperCase().slice(0, 2)}</span><span><h4>{claim.assetLabel}</h4><p>Updated {claim.lastUpdated}</p><div className="pulse-line"><span style={{ width: `${claim.progress}%` }} /></div></span><span className="claim-row-right"><strong>{formatShort(claim.amount)}</strong><StatusBadge status={claim.status} size="small" /></span></Link>)}</div></div>
      <div className="activity-summary"><div><SectionEyebrow>Make it actionable</SectionEyebrow><h3>A clear next step beats a scattered search.</h3><p>Virasat helps you prepare the record. The decision and submission stay with you.</p></div><div className="activity-summary-art" /><Link href="/fintwin" className="text-button">Explore FinTwin <ArrowUpRight size={14} /></Link></div>
    </section>
  </div>;
}
