import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronRight, Filter, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MockDataService } from "@/services/dataService";
import { SectionEyebrow, StatusBadge } from "@/components/StatusBadge";
import { mockRegulators } from "@/data/mockData";
import { trpc } from "@/lib/trpc";
import type { Claim, RegulatorId } from "@/types";

const format = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const statuses = ["All", "In Progress", "Documents Pending", "Ready to Submit", "Submitted", "Claimed"];
const claimRoute = (claim: Claim) => `/claims/${claim.id}/assist`;

export default function Claims() {
  const [, navigate] = useLocation();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  const claimsQuery = trpc.claims.list.useQuery(undefined, { enabled: backendEnabled, retry: false });

  useEffect(() => {
    MockDataService.getClaims().then(setClaims);
  }, []);

  const apiStatusToUi: Record<string, Claim["status"]> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    DOCUMENTS_PENDING: "Documents Pending",
    AI_VERIFICATION: "AI Verification",
    READY_TO_SUBMIT: "Ready to Submit",
    SUBMITTED: "Submitted",
    CLAIMED: "Claimed",
    REJECTED: "Rejected",
  };
  const resolvedClaims: Claim[] = claimsQuery.data?.map((claim) => ({
    ...claim,
    id: String(claim.id),
    assetId: String(claim.assetId),
    regulatorId: claim.regulatorId as RegulatorId,
    status: apiStatusToUi[claim.status] ?? "In Progress",
    lastUpdated: new Date(claim.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  })) ?? claims;
  const filtered = useMemo(() => resolvedClaims.filter((claim) => (
    (filter === "All" || claim.status === filter) && claim.assetLabel.toLowerCase().includes(query.toLowerCase())
  )), [resolvedClaims, filter, query]);

  return (
    <div className="page-wrap">
      <div className="page-header-row animate-in">
        <div>
          <SectionEyebrow>Keep the thread</SectionEyebrow>
          <h1 className="page-heading">Claims, <em>in motion.</em></h1>
          <p className="page-lede">A quiet, clear view of what is being prepared, what needs a document, and what you have self-reported as submitted.</p>
        </div>
        <Button className="btn-primary" onClick={() => document.querySelector<HTMLButtonElement>(".global-claim-button")?.click()}>
          Start new claim <ArrowUpRight size={15} />
        </Button>
      </div>

      <div className="claim-controls animate-in delay-1">
        <div className="filter-tabs" role="tablist" aria-label="Filter claims">
          {statuses.map((status) => (
            <button key={status} className={`filter-tab ${filter === status ? "filter-tab-active" : ""}`} onClick={() => setFilter(status)} role="tab" aria-selected={filter === status}>{status}</button>
          ))}
        </div>
        <div className="topbar-search claim-search">
          <Search size={15} />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search claims" placeholder="Search claims" />
        </div>
      </div>

      <section className="claim-timeline animate-in delay-2" aria-label="Claim activity timeline">
        {filtered.map((claim, index) => {
          const regulator = mockRegulators.find((item) => item.id === claim.regulatorId);
          const isComplete = claim.status === "Claimed" || claim.status === "Submitted";
          return (
            <article key={claim.id} className="claim-timeline-item" onClick={() => navigate(claimRoute(claim))}>
              <div className="claim-timeline-rail"><span className="claim-timeline-marker" style={{ background: regulator?.accent }}>{isComplete ? "✓" : String(index + 1).padStart(2, "0")}</span>{index < filtered.length - 1 && <span className="claim-timeline-line" />}</div>
              <div className="claim-timeline-card">
                <div className="claim-timeline-top">
                  <div><span className="claim-timeline-regulator">{regulator?.shortName ?? claim.regulatorId.toUpperCase()}</span><h2>{claim.assetLabel}</h2></div>
                  <StatusBadge status={claim.status} size="small" />
                </div>
                <div className="claim-timeline-bottom">
                  <div><span>{isComplete ? "Claim submitted" : claim.status === "Documents Pending" ? "Action required" : "Awaiting verification"}</span><small>{claim.documentsCount}/{claim.documentsTotal} documents ready · Updated {claim.lastUpdated}</small></div>
                  <strong>{format(claim.amount)}</strong>
                  <Link className="text-button" href={claimRoute(claim)} onClick={(event) => event.stopPropagation()}>Open <ChevronRight size={14} /></Link>
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && <div className="empty-state"><Filter size={22} /><p>No claims match this view.</p></div>}
      </section>
    </div>
  );
}
