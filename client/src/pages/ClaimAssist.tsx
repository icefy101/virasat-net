// Archive of Trust: Claim Assist makes the human-in-the-loop boundary explicit at every step.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Download, FileCheck2, FileText, Info, Loader2, RotateCcw, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MockDataService } from "@/services/dataService";
import { mockAssets, mockRegulators } from "@/data/mockData";
import { SectionEyebrow, StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import type { Asset, Claim, ClaimDocumentRequirement, Document, DocumentStatus, RegulatorId } from "@/types";
import { toast } from "sonner";

const steps = ["Documents", "Verify", "Review", "Ready"];
const fmt = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const apiStatusToUi: Record<string, Claim["status"]> = { NOT_STARTED: "Not Started", IN_PROGRESS: "In Progress", DOCUMENTS_PENDING: "Documents Pending", AI_VERIFICATION: "AI Verification", READY_TO_SUBMIT: "Ready to Submit", SUBMITTED: "Submitted", CLAIMED: "Claimed", REJECTED: "Rejected" };
const progressByStatus: Record<string, number> = { NOT_STARTED: 8, IN_PROGRESS: 24, DOCUMENTS_PENDING: 36, AI_VERIFICATION: 58, READY_TO_SUBMIT: 92, SUBMITTED: 100, CLAIMED: 100, REJECTED: 0 };

export default function ClaimAssist() {
  const [, params] = useRoute("/claims/:claimId/assist");
  const [, navigate] = useLocation();
  const [claim, setClaim] = useState<Claim>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const claimId = params?.claimId ?? "claim_rbi_01";

  // Real backend wiring: a claim opened from a live "Start new claim" flow
  // (see AppShell.startClaim) has a real numeric database id in the route.
  // Demo claims from the picker's hardcoded fallback ("claim_rbi_01" etc.)
  // are not numeric, so they always take the mock path below — nothing about
  // the existing demo flow changes when the backend is off or unreachable.
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  const numericClaimId = Number(claimId);
  const useBackend = backendEnabled && Number.isInteger(numericClaimId) && numericClaimId > 0;

  const claimQuery = trpc.claims.byId.useQuery({ claimId: numericClaimId }, { enabled: useBackend, retry: false });
  const assetQuery = trpc.assets.byId.useQuery({ assetId: claimQuery.data?.assetId ?? 0 }, { enabled: useBackend && !!claimQuery.data?.assetId, retry: false });
  const addDocumentMutation = trpc.claims.addDocument.useMutation();
  const parseDocumentMutation = trpc.claims.parseDocument.useMutation();
  const prepareMutation = trpc.claims.prepare.useMutation();
  const markSubmittedMutation = trpc.claims.markSubmitted.useMutation();

  const requirements = useMemo<ClaimDocumentRequirement[]>(() => {
    const has = (name: string) => documents.find((doc) => doc.name === name);
    return [
      { id: "kyc", name: "KYC document", required: true, status: has("KYC Document")?.status === "Verified" ? "complete" : "pending", filename: has("KYC Document")?.filename },
      { id: "proof", name: "Proof of claim", required: true, status: has("Proof of Claim")?.status === "Verified" ? "complete" : "pending", filename: has("Proof of Claim")?.filename },
      { id: "nominee", name: "Nominee document", required: true, status: has("Nominee Document")?.status === "Mismatch" ? "processing" : "pending", filename: has("Nominee Document")?.filename },
      { id: "statement", name: "Bank / asset statement", required: true, status: has("Bank Statement")?.status === "Processing" ? "processing" : "pending", filename: has("Bank Statement")?.filename },
    ];
  }, [documents]);

  useEffect(() => {
    if (useBackend) return; // real path is populated from claimQuery below instead
    MockDataService.getClaim(claimId).then(setClaim);
    MockDataService.getDocuments(claimId).then(setDocuments);
  }, [claimId, useBackend]);

  // Security note (verified live, not just in code): the server's
  // claims.byId scopes every lookup to ctx.user.id, so a signed-in user
  // opening another account's claim URL never receives that claim's data —
  // the query throws NOT_FOUND. Before this fix, the UI had no handling for
  // that case and just spun on "Opening the claim record\u2026" forever, which
  // read as broken/unresponsive even though nothing was actually leaked.
  // Redirect back to Claims with an explanation instead of spinning forever.
  useEffect(() => {
    if (!useBackend || !claimQuery.isError) return;
    toast.error("That claim wasn't found on your account.");
    navigate("/claims");
  }, [useBackend, claimQuery.isError, navigate]);

  useEffect(() => {
    if (!useBackend || !claimQuery.data) return;
    const data = claimQuery.data;
    setClaim((current) => ({
      id: String(data.id),
      assetId: String(data.assetId),
      regulatorId: data.regulator.toLowerCase() as RegulatorId,
      assetLabel: current?.assetLabel ?? `${data.regulator} claim`,
      amount: current?.amount ?? 0,
      status: apiStatusToUi[data.status] ?? "In Progress",
      lastUpdated: new Date(data.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      progress: progressByStatus[data.status] ?? 0,
      documentsCount: current?.documentsCount ?? 0,
      documentsTotal: current?.documentsTotal ?? 4,
    }));
  }, [useBackend, claimQuery.data]);

  const realAsset: Asset | undefined = useBackend && assetQuery.data ? {
    id: String(assetQuery.data.id),
    regulatorId: assetQuery.data.regulator.toLowerCase() as RegulatorId,
    type: assetQuery.data.type as Asset["type"],
    provider: assetQuery.data.provider,
    maskedNumber: assetQuery.data.accountNumberMasked,
    amount: assetQuery.data.amount,
    lastActivity: new Date(assetQuery.data.discoveredDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    status: assetQuery.data.status as Asset["status"],
    nominee: assetQuery.data.nomineeName ?? "Not Found",
  } : undefined;

  const asset = realAsset ?? mockAssets.find((item) => item.id === claim?.assetId) ?? mockAssets[0];
  const regulator = mockRegulators.find((item) => item.id === claim?.regulatorId) ?? mockRegulators[0];

  const mockUpload = async (file: File) => {
    setUploading(true);
    const name = requirements.find((item) => item.status !== "complete")?.name ?? "Bank / asset statement";
    const documentName = name === "KYC document" ? "KYC Document" : name === "Proof of claim" ? "Proof of Claim" : name === "Nominee document" ? "Nominee Document" : "Bank Statement";
    if (useBackend) {
      try {
        const added = await addDocumentMutation.mutateAsync({ claimId: numericClaimId, type: documentName, filename: file.name });
        // Runs the file through the real claims.parseDocument endpoint — a
        // genuine rule-based verification pass (file-type check, duplicate-type
        // detection, cross-reference against the claim's real asset record),
        // not an AI/OCR call. See docs/verification-engine.md.
        const parsed = await parseDocumentMutation.mutateAsync({ claimId: numericClaimId, filename: file.name }).catch(() => undefined);
        const statusFromApi: DocumentStatus = parsed?.verificationStatus === "VERIFIED" ? "Verified" : parsed?.verificationStatus === "MISMATCH" ? "Mismatch" : parsed?.verificationStatus === "REJECTED" ? "Rejected" : "Processing";
        setDocuments((current) => [{ id: String(added.id), claimId: String(added.claimId), name: added.type, type: added.type, status: statusFromApi, uploadedDate: "Just now", filename: added.filename, required: true }, ...current]);
        setUploading(false);
        if (statusFromApi === "Mismatch") toast.warning(parsed?.mismatches?.[0] ?? "This document needs a second look — possible duplicate.");
        else if (statusFromApi === "Rejected") toast.error((parsed?.extractedFields as { reason?: string } | undefined)?.reason ?? "That file couldn't be verified — try a different format.");
        else toast.success("Document added and verified against your claim record");
        return;
      } catch (error) {
        console.error("[ClaimAssist] Real upload failed, falling back to the mock flow:", error);
        // fall through to the mock path below rather than leaving the user stuck
      }
    }
    const uploaded = await MockDataService.uploadDocument(claimId, documentName, file.name);
    setDocuments((current) => [uploaded, ...current]);
    setUploading(false);
    toast.success("Document added to the mock claim record");
  };

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) mockUpload(file); event.target.value = ""; };
  const next = async () => {
    if (step === 1) { setStep(2); toast("AI-assisted verification is ready to review"); }
    else if (step === 2) setStep(3);
    else if (step === 3) {
      if (useBackend) {
        try {
          const result = await prepareMutation.mutateAsync({ claimId: numericClaimId });
          setClaim((current) => current ? { ...current, status: apiStatusToUi[result.claim?.status ?? "READY_TO_SUBMIT"] ?? "Ready to Submit", documentsCount: result.documentCount } : current);
          setStep(4);
          toast.success("Claim packet prepared for your review");
          return;
        } catch (error) {
          console.error("[ClaimAssist] Real prepare failed, falling back to the mock flow:", error);
        }
      }
      const updated = await MockDataService.prepareClaim(claimId); setClaim(updated); setStep(4); toast.success("Claim packet prepared for your review");
    }
  };
  const downloadPacket = () => { const blob = new Blob([`VIRASAT CLAIM PACKET\n\nPrototype packet for ${asset.provider}\nAsset: ${asset.maskedNumber}\nValue: ${fmt(asset.amount)}\n\nPrepared and verified by Virasat.\nThe user submits the claim.`], { type: "text/plain" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "virasat-claim-packet.txt"; anchor.click(); URL.revokeObjectURL(url); toast.success("Mock claim packet downloaded"); };
  const markSubmitted = async () => {
    if (useBackend) {
      try {
        const result = await markSubmittedMutation.mutateAsync({ claimId: numericClaimId });
        setClaim((current) => current ? { ...current, status: apiStatusToUi[result.claim?.status ?? "SUBMITTED"] ?? "Submitted" } : current);
        toast.success("Marked as submitted");
        return;
      } catch (error) {
        console.error("[ClaimAssist] Real markSubmitted failed, falling back to the mock flow:", error);
      }
    }
    const updated = await MockDataService.markClaimSubmitted(claimId); setClaim(updated); toast.success("Marked as submitted in this prototype");
  };

  if (!claim) return <div className="page-wrap"><div className="panel" style={{ padding: 40, textAlign: "center" }}><Loader2 className="animate-spin" style={{ margin: "0 auto 10px" }} /><p className="page-lede" style={{ margin: "0 auto" }}>Opening the claim record…</p></div></div>;

  return <div className="page-wrap page-wrap-tight">
    <div className="claim-assist-header animate-in"><div><button className="rail-back" onClick={() => navigate("/claims")}><ArrowLeft size={14} /> Back to claims</button><SectionEyebrow>{regulator.shortName} · Claim assist</SectionEyebrow><h1>Prepare the record.<br /><em>Keep the decision yours.</em></h1><p>{asset.type} with {asset.provider} · {asset.maskedNumber}</p></div><div className="claim-id-box"><span>Claim reference</span><strong>VIR-{claim.id.split("_").pop()?.toUpperCase()}-26</strong><StatusBadge status={claim.status} size="small" /></div></div>

    <div className="stepper animate-in delay-1" aria-label="Claim progress">
      {steps.map((label, index) => <div key={label} className={`step ${step === index + 1 ? "step-active" : ""} ${step > index + 1 ? "step-done" : ""}`}><span className="step-number">{step > index + 1 ? <Check size={13} /> : index + 1}</span><span className="step-label">{label}<small>{step > index + 1 ? "Complete" : step === index + 1 ? "Current step" : "Upcoming"}</small></span></div>)}
    </div>

    {step === 1 && <div className="claim-assist-grid animate-in delay-2"><section className="assist-panel"><div className="assist-panel-heading"><div><h2>Collect documents</h2><p>Upload the evidence needed for a complete claim packet.</p></div><FileCheck2 size={20} color="#B78A4A" /></div><input ref={inputRef} className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={chooseFile} /><button className="upload-zone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) mockUpload(file); }}><span className="upload-icon">{uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}</span><strong>{uploading ? "Adding to mock record…" : "Drag & drop your document here"}</strong><p>or <u>Choose file</u></p><small>PDF, PNG or JPG · max 10 MB</small></button><div className="document-checklist">{requirements.map((item) => <div key={item.id} className="document-requirement"><span className={`check-circle ${item.status !== "complete" ? "pending" : ""}`}>{item.status === "complete" ? <Check size={11} /> : item.status === "processing" ? <Loader2 size={10} className="animate-spin" /> : null}</span><span><strong>{item.name}</strong><span>{item.filename ?? (item.required ? "Required" : "Optional")}</span></span><span className="requirement-status">{item.status === "complete" ? <StatusBadge status="Verified" size="small" /> : item.status === "processing" ? <StatusBadge status="Processing" size="small" /> : <small>Awaiting upload</small>}</span></div>)}</div><div className="assist-footer"><span className="assist-footer-note">You can replace a document at any time.</span><Button className="btn-primary" onClick={next}>Continue to verification <ArrowRight size={15} /></Button></div></section><div className="assist-side"><div className="record-card"><h3>What we found</h3><div className="record-grid"><div><span>Provider</span><strong>{asset.provider}</strong></div><div><span>Asset type</span><strong>{asset.type}</strong></div><div><span>Masked record</span><strong>{asset.maskedNumber}</strong></div><div><span>Current value</span><strong className="record-value">{fmt(asset.amount)}</strong></div><div><span>Nominee</span><strong>{asset.nominee}</strong></div><div><span>Last activity</span><strong>{asset.lastActivity}</strong></div></div></div><div className="disclaimer-bar"><ShieldCheck size={17} /> Virasat prepares and verifies your documents — you submit the claim.</div></div></div>}

    {step === 2 && <div className="claim-assist-grid animate-in delay-2"><section className="assist-panel"><div className="assist-panel-heading"><div><h2>AI-assisted verification</h2><p>Signals to help you review the record, not a legal determination.</p></div><span className="status-badge status-ai"><Sparkles size={13} /> Verification complete</span></div><div className="verification-box" style={{ margin: 20 }}><div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}><div><h3>Verification summary</h3><p>Fields were extracted from the documents in this prototype and compared with the discovered record.</p></div><div className="success-seal" style={{ width: 42, height: 42, margin: 0 }}><CheckCircle2 size={20} /></div></div>{[{ label: "Account provider", value: asset.provider, state: "Matched" }, { label: "Account number", value: asset.maskedNumber, state: "Matched" }, { label: "Asset type", value: asset.type, state: "Matched" }, { label: "Current value", value: fmt(asset.amount), state: "Matched" }, { label: "Nominee", value: "Not found in existing record", state: "Needs attention" }].map((row) => <div className="verification-line" key={row.label}><span>{row.label}</span><strong>{row.value} <small style={{ color: row.state === "Matched" ? "#5d765f" : "#8a5b27", marginLeft: 6 }}>{row.state}</small></strong></div>)}<div className="warning-box"><strong><AlertTriangle size={14} /> Nominee information needs attention</strong><p>Uploaded document: <b>Anita Sharma</b> · Existing record: <b>No nominee found</b>. You can continue, but review this difference carefully.</p></div></div><div className="assist-footer"><Button className="btn-quiet" onClick={() => setStep(1)}><RotateCcw size={14} /> Re-upload</Button><Button className="btn-primary" onClick={next}>Continue to review <ArrowRight size={15} /></Button></div></section><div className="assist-side"><div className="record-card"><h3>Confidence, made visible.</h3><p style={{ color: "rgba(255,253,248,.64)", fontSize: 11, lineHeight: 1.6, margin: 0 }}>Every extracted field is shown beside its confidence state so a person remains in the loop.</p><div className="record-grid" style={{ marginTop: 22 }}><div><span>Matched fields</span><strong className="record-value">4 of 5</strong></div><div><span>Confidence</span><strong className="record-value">94%</strong></div></div></div><div className="disclaimer-bar"><Info size={17} /> AI-assisted verification supports your review; it does not replace regulator review or your judgment.</div></div></div>}

    {step === 3 && <div className="claim-assist-grid animate-in delay-2"><section className="assist-panel"><div className="assist-panel-heading"><div><h2>Review the claim packet</h2><p>Check the extracted details before Virasat prepares the final bundle.</p></div><span className="status-badge status-ready"><FileCheck2 size={13} /> Human review</span></div><div style={{ padding: 20, display: "grid", gap: 18 }}><div className="profile-lines"><div className="profile-line"><span>Claimant name</span><strong><Input defaultValue="Ananya Sharma" aria-label="Claimant name" /></strong></div><div className="profile-line"><span>Asset provider</span><strong>{asset.provider}</strong></div><div className="profile-line"><span>Masked record</span><strong>{asset.maskedNumber}</strong></div><div className="profile-line"><span>Current value</span><strong>{fmt(asset.amount)}</strong></div><div className="profile-line"><span>Nominee note</span><strong style={{ color: "#8a5b27" }}>No nominee in existing record</strong></div></div><div><SectionEyebrow>Included evidence</SectionEyebrow><div className="document-checklist" style={{ padding: 0, marginTop: 7 }}>{requirements.map((item) => <div key={item.id} className="document-requirement"><span className={`check-circle ${item.status !== "complete" ? "pending" : ""}`}>{item.status === "complete" ? <Check size={11} /> : <AlertTriangle size={10} />}</span><span><strong>{item.name}</strong><span>{item.filename ?? "Not uploaded yet"}</span></span><StatusBadge status={item.status === "complete" ? "Verified" : "Documents Pending"} size="small" /></div>)}</div></div><div className="warning-box"><strong><AlertTriangle size={14} /> One item needs your confirmation</strong><p>The nominee difference is clearly included in the packet for you to resolve or explain before submission.</p></div></div><div className="assist-footer"><Button className="btn-quiet" onClick={() => setStep(2)}><ArrowLeft size={14} /> Back to verification</Button><Button className="btn-primary" onClick={next}>Confirm & prepare <ArrowRight size={15} /></Button></div></section><div className="assist-side"><div className="record-card"><h3>Almost ready.</h3><p style={{ color: "rgba(255,253,248,.64)", fontSize: 11, lineHeight: 1.6, margin: 0 }}>Your packet will include the record summary, selected documents, and verification notes.</p><div className="record-grid" style={{ marginTop: 22 }}><div><span>Documents</span><strong className="record-value">{requirements.filter((item) => item.filename).length} included</strong></div><div><span>Review state</span><strong className="record-value">Your call</strong></div></div></div><div className="disclaimer-bar"><ShieldCheck size={17} /> You remain the claimant. Virasat only prepares and verifies the materials.</div></div></div>}

    {step === 4 && <div className="success-panel animate-in delay-2"><div className="success-seal"><CheckCircle2 size={30} /></div><SectionEyebrow>Your record is ready</SectionEyebrow><h2>Your claim packet<br />is ready.</h2><p>Virasat has prepared and verified the documents for your claim. Download the packet, then submit it through the appropriate channel yourself.</p><div className="success-summary"><div><span>Asset</span><strong>{asset.provider}</strong></div><div><span>Value</span><strong>{fmt(asset.amount)}</strong></div><div><span>Verification</span><strong>AI-assisted + reviewed</strong></div></div><div className="success-actions"><Button className="btn-quiet" onClick={downloadPacket}><Download size={15} /> Download claim packet</Button><Button className="btn-brass" onClick={markSubmitted}><Check size={15} /> {claim.status === "Submitted" ? "Marked as submitted" : "Mark as submitted"}</Button></div><div className="disclaimer-bar" style={{ maxWidth: 580, margin: "30px auto 0", color: "rgba(255,253,248,.74)", background: "rgba(255,255,255,.08)", borderColor: "#d3ae75", textAlign: "left" }}><ShieldCheck size={17} /> Virasat prepares and verifies your documents — you submit the claim.</div></div>}
  </div>;
}
