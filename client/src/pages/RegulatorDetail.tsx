// Archive of Trust: detail pages narrow the lens from institution to individual evidence, without exposing sensitive identifiers.
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { MockDataService } from "@/services/dataService";
import { SectionEyebrow, StatusBadge } from "@/components/StatusBadge";
import type { Asset, Regulator } from "@/types";

const format = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function RegulatorDetail() {
  const [, params] = useRoute("/regulator/:regulatorId");
  const [, navigate] = useLocation();
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  useEffect(() => { MockDataService.getRegulators().then(setRegulators); MockDataService.getAssets().then(setAssets); }, []);
  const regulator = useMemo(() => regulators.find((item) => item.id === params?.regulatorId), [regulators, params?.regulatorId]);
  const regulatorAssets = assets.filter((asset) => asset.regulatorId === params?.regulatorId);

  if (!regulator) return <div className="page-wrap"><Link className="rail-back" href="/home"><ArrowLeft size={14} /> Back to dashboard</Link><h1 className="page-heading">Record not found.</h1><p className="page-lede">The mock institution record is not available in this prototype.</p></div>;

  return <div className="page-wrap page-wrap-tight"><div className="detail-layout">
    <aside className="detail-rail animate-in"><Link className="rail-back" href="/home"><ArrowLeft size={14} /> Back to dashboard</Link><SectionEyebrow>{regulator.category}</SectionEyebrow><h1>{regulator.shortName}<br /><em>{regulator.shortName === "RBI" ? "deposits" : regulator.category.toLowerCase()}</em></h1><p>{regulator.name}. Here is what Virasat found in the connected mock record.</p><StatusBadge status={regulator.status} /><div className="rail-numbers"><div className="rail-number"><strong>{regulator.assetCount}</strong><span>Assets found</span></div><div className="rail-number"><strong>{format(regulator.totalAmount)}</strong><span>Discovered value</span></div></div></aside>
    <section className="animate-in delay-1"><div className="discovery-intro"><SectionEyebrow>Record revealed</SectionEyebrow><strong>{format(regulator.totalAmount)}</strong><p>{regulator.assetCount} assets surfaced from the connected {regulator.shortName} record.</p></div><div className="page-header-row"><div><SectionEyebrow>Connected record</SectionEyebrow><h2 className="section-title">Individual assets</h2><p className="page-lede">Review each record, then choose where you want to begin preparing a claim.</p></div><Button className="btn-primary" onClick={() => navigate(`/claims/${regulatorAssets[0] ? regulatorAssets[0].id === "asset_rbi_01" ? "claim_rbi_01" : regulatorAssets[0].id === "asset_epfo_01" ? "claim_epfo_01" : regulatorAssets[0].id === "asset_lic_01" ? "claim_lic_01" : "claim_rbi_02" : "claim_rbi_01"}/assist`)}>Review first record <ArrowUpRight size={15} /></Button></div>
      <div className="asset-list">{regulatorAssets.map((asset, index) => <article key={asset.id} className={`asset-item animate-in delay-${Math.min(index + 1, 4)}`} style={{ "--reg-accent": regulator.accent } as React.CSSProperties}><div className="asset-item-main"><span className="asset-item-icon"><FileText size={17} /></span><div><h3>{asset.type} · {asset.provider}</h3><p>{asset.maskedNumber}</p><p><CalendarDays size={11} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Last known activity {asset.lastActivity}</p></div></div><div className="asset-item-meta"><span className="asset-item-amount">{format(asset.amount)}</span><StatusBadge status={asset.status} size="small" /><Button className="btn-quiet" size="sm" onClick={() => { const claim = asset.id === "asset_rbi_01" ? "claim_rbi_01" : asset.id === "asset_epfo_01" ? "claim_epfo_01" : asset.id === "asset_lic_01" ? "claim_lic_01" : "claim_rbi_02"; navigate(`/claims/${claim}/assist`); }}>Start claim assist <ChevronRight size={13} /></Button></div></article>)}</div>
      <div className="disclaimer-bar" style={{ marginTop: 16 }}><ShieldCheck size={17} /> Virasat prepares and verifies your documents. It does not access regulator systems or submit claims on your behalf.</div>
    </section>
  </div></div>;
}
