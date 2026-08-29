// Archive of Trust: deliberately realistic mock records make the hackathon story legible without exposing real data.
import type {
  Asset,
  Claim,
  Document,
  FinTwinScenario,
  Notification,
  Regulator,
  User,
} from "@/types";

export const mockUser: User = {
  id: "usr_001",
  name: "Ananya Sharma",
  email: "ananya.sharma@example.com",
  phone: "+91 98••• 42•••",
  pan: "ABCDE****F",
  state: "Maharashtra",
  city: "Pune",
  avatar: "AS",
  trustedContact: { id: "tc_001", name: "Rohan Sharma", relation: "Brother", phone: "+91 97••• 19•••" },
};

export const mockRegulators: Regulator[] = [
  { id: "rbi", name: "Reserve Bank of India", shortName: "RBI", description: "Bank deposits & dormant accounts", category: "Deposits", accent: "#B78A4A", assetCount: 3, totalAmount: 1274500, status: "In Progress", icon: "RBI" },
  { id: "epfo", name: "Employees’ Provident Fund Organisation", shortName: "EPFO", description: "Provident fund savings", category: "Retirement", accent: "#7E9B83", assetCount: 2, totalAmount: 1842000, status: "Documents Pending", icon: "EP" },
  { id: "irdai", name: "Insurance Regulatory Authority", shortName: "IRDAI", description: "Insurance policies & benefits", category: "Insurance", accent: "#A87A58", assetCount: 2, totalAmount: 960000, status: "Not Started", icon: "IR" },
  { id: "sebi", name: "Securities and Exchange Board", shortName: "SEBI", description: "Securities & mutual funds", category: "Investments", accent: "#5C7E73", assetCount: 3, totalAmount: 2154000, status: "Claimed", icon: "SE" },
  { id: "lic", name: "Life Insurance Corporation", shortName: "LIC", description: "Life insurance policies", category: "Life cover", accent: "#9B6B56", assetCount: 2, totalAmount: 743000, status: "Ready to Submit", icon: "LI" },
];

export const mockAssets: Asset[] = [
  { id: "asset_rbi_01", regulatorId: "rbi", type: "Bank Deposit", provider: "State Bank of India", maskedNumber: "XXXX XXXX 2847", amount: 482500, lastActivity: "12 Mar 2024", status: "In Progress", nominee: "Not Found" },
  { id: "asset_rbi_02", regulatorId: "rbi", type: "Bank Deposit", provider: "HDFC Bank", maskedNumber: "XXXX XXXX 1172", amount: 612000, lastActivity: "08 Aug 2022", status: "Documents Pending", nominee: "Anita Sharma" },
  { id: "asset_rbi_03", regulatorId: "rbi", type: "Bank Deposit", provider: "Bank of Baroda", maskedNumber: "XXXX XXXX 9031", amount: 180000, lastActivity: "22 Nov 2021", status: "Not Started", nominee: "Not Found" },
  { id: "asset_epfo_01", regulatorId: "epfo", type: "EPF", provider: "EPFO — Pune", maskedNumber: "MH/PUN/••••/4412", amount: 1242000, lastActivity: "31 Mar 2023", status: "Documents Pending", nominee: "Rohan Sharma" },
  { id: "asset_epfo_02", regulatorId: "epfo", type: "EPF", provider: "EPFO — Mumbai", maskedNumber: "MH/MUM/••••/9038", amount: 600000, lastActivity: "31 Mar 2022", status: "In Progress", nominee: "Not Found" },
  { id: "asset_irdai_01", regulatorId: "irdai", type: "Insurance", provider: "Max Life Insurance", maskedNumber: "POL •••• 7305", amount: 540000, lastActivity: "18 Jun 2020", status: "Not Started", nominee: "Anita Sharma" },
  { id: "asset_irdai_02", regulatorId: "irdai", type: "Insurance", provider: "New India Assurance", maskedNumber: "POL •••• 1149", amount: 420000, lastActivity: "04 Sep 2019", status: "Not Started", nominee: "Not Found" },
  { id: "asset_sebi_01", regulatorId: "sebi", type: "Mutual Fund", provider: "Mirae Asset", maskedNumber: "FOLIO •••• 3381", amount: 892000, lastActivity: "30 Sep 2023", status: "Claimed", nominee: "Rohan Sharma" },
  { id: "asset_sebi_02", regulatorId: "sebi", type: "Mutual Fund", provider: "Parag Parikh Flexi Cap", maskedNumber: "FOLIO •••• 8014", amount: 754000, lastActivity: "30 Sep 2023", status: "Claimed", nominee: "Rohan Sharma" },
  { id: "asset_sebi_03", regulatorId: "sebi", type: "Mutual Fund", provider: "HDFC Balanced Advantage", maskedNumber: "FOLIO •••• 2419", amount: 508000, lastActivity: "30 Sep 2023", status: "Claimed", nominee: "Anita Sharma" },
  { id: "asset_lic_01", regulatorId: "lic", type: "LIC Policy", provider: "LIC Jeevan Anand", maskedNumber: "POL •••• 6621", amount: 523000, lastActivity: "11 Jan 2024", status: "Ready to Submit", nominee: "Anita Sharma" },
  { id: "asset_lic_02", regulatorId: "lic", type: "LIC Policy", provider: "LIC New Endowment", maskedNumber: "POL •••• 1188", amount: 220000, lastActivity: "11 Jan 2024", status: "Ready to Submit", nominee: "Rohan Sharma" },
];

export const mockClaims: Claim[] = [
  { id: "claim_rbi_01", assetId: "asset_rbi_01", regulatorId: "rbi", assetLabel: "SBI · Savings Deposit", amount: 482500, status: "AI Verification", lastUpdated: "Today, 10:42 AM", progress: 58, documentsCount: 2, documentsTotal: 4 },
  { id: "claim_epfo_01", assetId: "asset_epfo_01", regulatorId: "epfo", assetLabel: "EPFO · Pune account", amount: 1242000, status: "Documents Pending", lastUpdated: "Yesterday, 4:18 PM", progress: 36, documentsCount: 2, documentsTotal: 5 },
  { id: "claim_lic_01", assetId: "asset_lic_01", regulatorId: "lic", assetLabel: "LIC Jeevan Anand", amount: 523000, status: "Ready to Submit", lastUpdated: "18 Aug 2026", progress: 92, documentsCount: 4, documentsTotal: 4 },
  { id: "claim_sebi_01", assetId: "asset_sebi_01", regulatorId: "sebi", assetLabel: "Mirae Asset · Folio 3381", amount: 892000, status: "Claimed", lastUpdated: "04 Aug 2026", progress: 100, documentsCount: 4, documentsTotal: 4 },
  { id: "claim_rbi_02", assetId: "asset_rbi_02", regulatorId: "rbi", assetLabel: "HDFC · Savings Deposit", amount: 612000, status: "In Progress", lastUpdated: "29 Jul 2026", progress: 24, documentsCount: 1, documentsTotal: 4 },
];

export const mockDocuments: Document[] = [
  { id: "doc_001", claimId: "claim_rbi_01", name: "KYC Document", type: "Identity", status: "Verified", uploadedDate: "Today, 10:11 AM", filename: "ananya-pan-redacted.pdf", required: true },
  { id: "doc_002", claimId: "claim_rbi_01", name: "Proof of Claim", type: "Claim proof", status: "Verified", uploadedDate: "Today, 10:14 AM", filename: "sbi-letter.pdf", required: true },
  { id: "doc_003", claimId: "claim_rbi_01", name: "Nominee Document", type: "Nominee", status: "Mismatch", uploadedDate: "Today, 10:21 AM", filename: "nominee-anita.jpg", required: true, verificationNote: "Nominee differs from existing record" },
  { id: "doc_004", claimId: "claim_epfo_01", name: "Bank Statement", type: "Account proof", status: "Processing", uploadedDate: "Yesterday, 4:16 PM", filename: "account-statement.pdf", required: true },
  { id: "doc_005", claimId: "claim_lic_01", name: "Policy Document", type: "Policy proof", status: "Verified", uploadedDate: "18 Aug 2026", filename: "lic-policy.pdf", required: true },
  { id: "doc_006", claimId: "claim_lic_01", name: "KYC Document", type: "Identity", status: "Verified", uploadedDate: "18 Aug 2026", filename: "ananya-pan-redacted.pdf", required: true },
];

export const mockNotifications: Notification[] = [
  { id: "n_001", title: "RBI claim", detail: "AI verification completed", time: "12 min ago", tone: "success", claimId: "claim_rbi_01", unread: true },
  { id: "n_002", title: "EPFO claim", detail: "Additional document required", time: "Yesterday", tone: "warning", claimId: "claim_epfo_01", unread: true },
  { id: "n_003", title: "LIC claim", detail: "Claim packet ready", time: "18 Aug", tone: "info", claimId: "claim_lic_01" },
  { id: "n_004", title: "Security check", detail: "New session from Chrome on macOS", time: "21 Aug", tone: "security" },
];

export const mockScenarios: FinTwinScenario[] = [
  { id: "sc_001", name: "A balanced 10-year path", amount: 500000, investmentType: "Mutual Fund", horizon: 10, projectedValue: 1060000, createdAt: "22 Aug 2026" },
  { id: "sc_002", name: "A steady PPF horizon", amount: 300000, investmentType: "PPF", horizon: 7, projectedValue: 480000, createdAt: "20 Aug 2026" },
];

export const chartData = [
  { year: "Now", value: 500000 },
  { year: "2 yrs", value: 608000 },
  { year: "4 yrs", value: 739000 },
  { year: "6 yrs", value: 898000 },
  { year: "8 yrs", value: 1091000 },
  { year: "10 yrs", value: 1326000 },
];
