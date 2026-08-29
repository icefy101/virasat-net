// Archive of Trust: statuses use color, icon, and language together so state is never conveyed by color alone.
import { AlertCircle, Check, CircleDashed, Clock3, FileCheck2, ShieldAlert, Sparkles } from "lucide-react";
import type { ClaimStatus, DocumentStatus } from "@/types";

const statusMap: Record<string, { label: string; className: string; icon: typeof Check }> = {
  "Not Started": { label: "Not started", className: "status-neutral", icon: CircleDashed },
  "In Progress": { label: "In progress", className: "status-progress", icon: Clock3 },
  "Documents Pending": { label: "Documents pending", className: "status-warning", icon: AlertCircle },
  "AI Verification": { label: "AI verification", className: "status-ai", icon: Sparkles },
  "Ready to Submit": { label: "Ready to submit", className: "status-ready", icon: FileCheck2 },
  Submitted: { label: "Submitted", className: "status-ready", icon: Check },
  Claimed: { label: "Claimed", className: "status-claimed", icon: Check },
  Rejected: { label: "Rejected", className: "status-danger", icon: ShieldAlert },
  Uploaded: { label: "Uploaded", className: "status-progress", icon: Clock3 },
  Processing: { label: "Processing", className: "status-ai", icon: Sparkles },
  Verified: { label: "Verified", className: "status-claimed", icon: Check },
  Mismatch: { label: "Mismatch", className: "status-warning", icon: AlertCircle },
};

export function StatusBadge({ status, size = "default" }: { status: ClaimStatus | DocumentStatus; size?: "default" | "small" }) {
  const config = statusMap[status] ?? statusMap["Not Started"];
  const Icon = config.icon;
  return (
    <span className={`status-badge ${config.className} ${size === "small" ? "status-badge-small" : ""}`}>
      <Icon size={size === "small" ? 11 : 13} strokeWidth={2.2} />
      {config.label}
    </span>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow"><span className="eyebrow-mark" />{children}</div>;
}
