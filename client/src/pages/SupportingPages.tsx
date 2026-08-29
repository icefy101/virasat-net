// Archive of Trust: supporting screens are intentionally lighter, keeping the highest polish on discovery and claim preparation.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileCheck2, FileText, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MockDataService } from "@/services/dataService";
import { mockDocuments, mockRegulators, mockUser } from "@/data/mockData";
import { SectionEyebrow, StatusBadge } from "@/components/StatusBadge";
import { Brand } from "@/components/Brand";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Document as VirasatDocument } from "@/types";

export function Documents() {
  const [documents, setDocuments] = useState(mockDocuments);
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  const documentsQuery = trpc.documents.list.useQuery(undefined, { enabled: backendEnabled, retry: false });
  useEffect(() => { MockDataService.getDocuments().then(setDocuments); }, []);
  useEffect(() => {
    if (!documentsQuery.data) return;
    const statusMap: Record<string, VirasatDocument["status"]> = { UPLOADED: "Uploaded", PROCESSING: "Processing", VERIFIED: "Verified", MISMATCH: "Mismatch", REJECTED: "Rejected" };
    setDocuments(documentsQuery.data.map((doc) => ({ id: String(doc.id), claimId: String(doc.claimId), name: doc.type, type: doc.type, status: statusMap[doc.verificationStatus] ?? "Uploaded", uploadedDate: new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), filename: doc.filename, required: true })));
  }, [documentsQuery.data]);
  return <div className="page-wrap"><div className="page-header-row animate-in"><div><SectionEyebrow>Evidence library</SectionEyebrow><h1 className="page-heading">Documents, <em>kept clear.</em></h1><p className="page-lede">A private index of the files you have added to your mock claims. We never show raw sensitive content here.</p></div><Button className="btn-quiet" onClick={() => toast("Choose a claim to add another document")}> <FileText size={15} /> Add document</Button></div><div className="claims-table-wrap animate-in delay-1"><table className="claims-table document-table"><thead><tr><th>Document</th><th>Claim</th><th>Type</th><th>Verification</th><th>Uploaded</th><th>Action</th></tr></thead><tbody>{documents.map((doc) => <tr key={doc.id}><td><span className="doc-name"><i className="doc-icon"><FileText size={14} /></i>{doc.name}</span><span className="table-muted" style={{ display: "block", margin: "4px 0 0 35px" }}>{doc.filename ?? "Filename hidden"}</span></td><td><span className="table-muted">{doc.claimId.replace("claim_", "").toUpperCase()}</span></td><td className="table-muted">{doc.type}</td><td><StatusBadge status={doc.status} size="small" />{doc.verificationNote && <span className="table-muted" style={{ display: "block", marginTop: 5 }}>{doc.verificationNote}</span>}</td><td className="table-muted">{doc.uploadedDate}</td><td><button className="text-button" onClick={() => toast("Document preview is intentionally hidden in this privacy-safe prototype")}>Details <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div><div className="disclaimer-bar" style={{ marginTop: 15 }}><LockKeyhole size={16} /> Raw document content is not exposed in this prototype. Only metadata and verification states are shown.</div></div>;
}

export function Profile() {
  const [toggles, setToggles] = useState([true, true, true, false]);
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: backendEnabled, retry: false });
  const profile = profileQuery.data;
  return <div className="page-wrap"><div className="page-header-row animate-in"><div><SectionEyebrow>Your account</SectionEyebrow><h1 className="page-heading">Profile & <em>settings.</em></h1><p className="page-lede">Manage the personal record and notification choices that shape your Virasat workspace.</p></div></div><div className="profile-grid animate-in delay-1"><section className="profile-card"><h2>User KYC</h2><div className="profile-identity"><span className="avatar avatar-large">{mockUser.avatar}</span><div><h3>{profile?.name ?? mockUser.name}</h3><p>Verified profile · {mockUser.city}, {profile?.state ?? mockUser.state}</p></div></div><div className="profile-lines"><div className="profile-line"><span>Full name</span><strong>{profile?.name ?? mockUser.name}</strong></div><div className="profile-line"><span>PAN</span><strong>{profile?.maskedPan ?? mockUser.pan}</strong></div><div className="profile-line"><span>Email</span><strong>{profile?.email ?? mockUser.email}</strong></div><div className="profile-line"><span>Phone</span><strong>{profile?.phone ?? mockUser.phone}</strong></div><div className="profile-line"><span>Trusted contact</span><strong>{mockUser.trustedContact.name} · {mockUser.trustedContact.relation}</strong></div></div><Button className="btn-quiet" style={{ marginTop: 17 }} onClick={() => toast("Profile editing is mocked for this prototype")}>Edit profile</Button></section><section className="profile-card"><h2>Connected accounts</h2><div className="connection-list">{mockRegulators.map((regulator, index) => <div className="connection-item" key={regulator.id}><div className="connection-main"><i style={{ background: regulator.accent }}>{regulator.shortName.slice(0, 2)}</i><div><strong>{regulator.shortName}</strong><span>{index < 3 ? "Connected" : index === 3 ? "Pending" : "Not connected"}</span></div></div>{index < 3 ? <StatusBadge status="Verified" size="small" /> : <button className="text-button" onClick={() => toast(`${regulator.shortName} connection is a mock flow`)}>{index === 3 ? "Review" : "Connect"} <ChevronRight size={14} /></button>}</div>)}</div></section><section className="profile-card"><h2>Notification preferences</h2>{["Claim updates", "Document verification", "Security alerts", "Account updates"].map((label, index) => <div className="toggle-row" key={label}><div><strong>{label}</strong><span>Receive updates about your workspace</span></div><button className={`fake-toggle ${toggles[index] ? "" : "fake-toggle-off"}`} aria-label={`Toggle ${label}`} onClick={() => setToggles((values) => values.map((value, itemIndex) => itemIndex === index ? !value : value))} /></div>)}</section><section className="profile-card security-card"><h2>Security</h2><p style={{ color: "rgba(255,255,255,.62)", fontSize: 10, lineHeight: 1.5, margin: "-8px 0 14px" }}>Access is controlled at the user level. This view represents the product concept; it does not implement row-level security in the frontend.</p><div className="profile-lines"><div className="profile-line"><span><ShieldCheck size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Authentication</span><strong>Enabled</strong></div><div className="profile-line"><span>Active session</span><strong>Chrome on macOS</strong></div><div className="profile-line"><span>Last active</span><strong>Just now</strong></div><div className="profile-line"><span>MFA status</span><strong>Not configured</strong></div></div></section></div></div>;
}

export function Auth({ signup = false }: { signup?: boolean }) {
  const [, navigate] = useLocation();
  const backendEnabled = import.meta.env.VITE_USE_BACKEND === "true";
  const signupMutation = trpc.auth.signup.useMutation();
  const loginMutation = trpc.auth.login.useMutation();
  const pending = signupMutation.isPending || loginMutation.isPending;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (!backendEnabled) {
      // Mock/demo path — unchanged from before.
      navigate("/onboarding");
      toast.success(signup ? "Account created in the mock environment" : "Welcome back to the mock workspace");
      return;
    }

    if (signup && password !== confirm) { toast.error("Passwords don't match"); return; }

    try {
      if (signup) {
        await signupMutation.mutateAsync({ name, email, password });
        toast.success("Account created");
      } else {
        await loginMutation.mutateAsync({ email, password });
        toast.success("Welcome back");
      }
      navigate("/onboarding");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  };

  return <div className="auth-root"><aside className="auth-aside"><Brand light /><div className="auth-aside-copy"><SectionEyebrow>One record, held together</SectionEyebrow><h1>What was built<br /><em>shouldn’t get lost.</em></h1><p>Virasat brings scattered financial records into a calm, human-readable continuity workspace.</p></div><div className="auth-quote">Prepare the claim. Keep the decision yours.</div></aside><main className="auth-panel"><form className="auth-form" onSubmit={submit}><SectionEyebrow>Private demo workspace</SectionEyebrow><h2>{signup ? "Create your record." : "Welcome back."}</h2><p>{signup ? "Start with a mock profile, then connect the institutions that matter." : "Sign in to continue working through your financial continuity record."}</p><div className="auth-fields">{signup && <div className="auth-field"><label htmlFor="name">Full name</label><Input id="name" name="name" placeholder="Ananya Sharma" required={backendEnabled} /></div>}<div className="auth-field"><label htmlFor="email">Email address</label><Input id="email" name="email" type="email" defaultValue={backendEnabled ? undefined : "ananya.sharma@example.com"} placeholder="you@example.com" required /></div><div className="auth-field"><label htmlFor="password">Password</label><Input id="password" name="password" type="password" defaultValue={backendEnabled ? undefined : "password"} placeholder="••••••••" required minLength={backendEnabled && signup ? 8 : undefined} /></div>{signup && <div className="auth-field"><label htmlFor="confirm">Confirm password</label><Input id="confirm" name="confirm" type="password" defaultValue={backendEnabled ? undefined : "password"} placeholder="••••••••" required={backendEnabled} /></div>}<Button className="btn-primary auth-submit" type="submit" disabled={pending}>{pending ? "Please wait…" : signup ? "Create account" : "Login"} <ArrowRight size={15} /></Button></div><p className="auth-switch">{signup ? "Already have a record?" : "New to Virasat?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p><p className="auth-footnote"><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} /> {backendEnabled ? "Your account is real and private to you — no regulator system or financial account is actually connected." : "This is a frontend prototype. No real financial or regulator connection is made."}</p></form></main></div>;
}

function BrandForAuth() { return <Link href="/login" className="group inline-flex items-center gap-3"><span className="relative grid size-10 place-items-center overflow-hidden rounded-[13px] bg-[#B78A4A]"><span className="absolute left-[11px] top-[10px] h-[20px] w-[8px] rotate-[26deg] rounded-sm bg-[#143B2D]" /><span className="absolute right-[11px] top-[10px] h-[20px] w-[8px] -rotate-[26deg] rounded-sm bg-[#143B2D]" /><span className="absolute bottom-[8px] left-1/2 h-[10px] w-[5px] -translate-x-1/2 rounded-sm bg-[#143B2D]" /></span><span className="font-serif text-[24px] tracking-[-0.045em] text-[#FCFAF4]">Virasat</span></Link>; }

export function Onboarding() {
  const [, navigate] = useLocation();
  const [connected, setConnected] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const connect = (id: string) => { setLoading(id); window.setTimeout(() => { setConnected((items) => [...items, id]); setLoading(null); toast.success("Secure mock connection established"); }, 600); };
  return <div className="app-root" style={{ minHeight: "100vh", display: "block" }}><div className="onboarding-wrap"><div style={{ marginBottom: 35 }}><Brand /></div><div className="onboarding-header animate-in"><div><SectionEyebrow>Step 01 · Connect the record</SectionEyebrow><h1>Bring your financial picture <em>together.</em></h1><p>Connect the institutions you want to explore. This demo uses mock connections only—no regulator system or financial account is accessed.</p></div><div className="onboarding-progress"><span>{connected.length} of 5 connected</span><div className="progress-bar"><span style={{ width: `${connected.length * 20}%` }} /></div></div></div><div className="connect-grid animate-in delay-1">{mockRegulators.map((regulator) => { const isConnected = connected.includes(regulator.id); const isLoading = loading === regulator.id; return <div className={`connect-card ${isConnected ? "connect-card-connected" : ""}`} key={regulator.id}><div><span className="connect-icon" style={{ background: regulator.accent }}>{regulator.icon.slice(0, 2)}</span><h3>{regulator.shortName}</h3><p>{regulator.description}</p></div><button className="connect-action" disabled={isConnected || isLoading} onClick={() => connect(regulator.id)}>{isConnected ? <><Check size={13} /> Connected</> : isLoading ? "Verifying consent…" : <>Connect <ChevronRight size={13} /></>}</button></div>; })}</div><div className="onboarding-bottom"><p><ShieldCheck size={14} style={{ verticalAlign: "-3px", marginRight: 5, color: "var(--brass)" }} /> Your connections are represented as a secure demo sequence: connecting → verifying consent → established.</p><Button className="btn-primary" onClick={() => navigate("/home")}>Continue to dashboard <ArrowRight size={15} /></Button></div></div></div>;
}
