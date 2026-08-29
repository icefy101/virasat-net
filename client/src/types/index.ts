// Archive of Trust: shared vocabulary keeps the interface evidence-first and backend-ready.
export type RegulatorId = "rbi" | "epfo" | "irdai" | "sebi" | "lic";
export type AssetType = "Bank Deposit" | "EPF" | "Insurance" | "Mutual Fund" | "LIC Policy";
export type ClaimStatus =
  | "Not Started"
  | "In Progress"
  | "Documents Pending"
  | "AI Verification"
  | "Ready to Submit"
  | "Submitted"
  | "Claimed"
  | "Rejected";
export type DocumentStatus = "Uploaded" | "Processing" | "Verified" | "Mismatch" | "Rejected";

export interface Regulator {
  id: RegulatorId;
  name: string;
  shortName: string;
  description: string;
  category: string;
  accent: string;
  assetCount: number;
  totalAmount: number;
  status: ClaimStatus;
  icon: string;
}

export interface Asset {
  id: string;
  regulatorId: RegulatorId;
  type: AssetType;
  provider: string;
  maskedNumber: string;
  amount: number;
  lastActivity: string;
  status: ClaimStatus;
  nominee: string;
}

export interface Claim {
  id: string;
  assetId: string;
  regulatorId: RegulatorId;
  assetLabel: string;
  amount: number;
  status: ClaimStatus;
  lastUpdated: string;
  progress: number;
  documentsCount: number;
  documentsTotal: number;
}

export interface Document {
  id: string;
  claimId: string;
  name: string;
  type: string;
  status: DocumentStatus;
  uploadedDate: string;
  filename?: string;
  required: boolean;
  verificationNote?: string;
}

export interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "success" | "warning" | "info" | "security";
  claimId?: string;
  unread?: boolean;
}

export interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  pan: string;
  state: string;
  city: string;
  avatar: string;
  trustedContact: TrustedContact;
}

export interface FinTwinScenario {
  id: string;
  name: string;
  amount: number;
  investmentType: "FD" | "Mutual Fund" | "PPF";
  horizon: number;
  projectedValue: number;
  createdAt: string;
}

export interface ClaimDocumentRequirement {
  id: string;
  name: string;
  required: boolean;
  status: "complete" | "pending" | "processing";
  filename?: string;
  progress?: number;
}

export interface VerificationField {
  label: string;
  value: string;
  confidence: number;
  state: "matched" | "attention" | "unverified";
}
