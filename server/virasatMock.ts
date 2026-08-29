export const mockAssets = [
  { id: 101, regulator: "RBI", type: "Bank Deposit", amount: 482500, currency: "INR", accountNumberMasked: "XXXX XXXX 2847", provider: "State Bank of India", nomineeName: null, discoveredDate: new Date("2024-03-12"), status: "AI_VERIFICATION" as const },
  { id: 102, regulator: "RBI", type: "Savings Account", amount: 792000, currency: "INR", accountNumberMasked: "XXXX XXXX 6012", provider: "HDFC Bank", nomineeName: "Anita Sharma", discoveredDate: new Date("2024-02-27"), status: "IN_PROGRESS" as const },
  { id: 103, regulator: "EPFO", type: "Provident Fund", amount: 1242000, currency: "INR", accountNumberMasked: "XXXX XX 4471", provider: "EPFO · Pune", nomineeName: "Anita Sharma", discoveredDate: new Date("2023-12-20"), status: "DOCUMENTS_PENDING" as const },
  { id: 104, regulator: "IRDAI", type: "Life Insurance", amount: 960000, currency: "INR", accountNumberMasked: "LIC-XXXX-1042", provider: "IRDAI register", nomineeName: null, discoveredDate: new Date("2024-01-18"), status: "NOT_STARTED" as const },
  { id: 105, regulator: "SEBI", type: "Mutual Fund", amount: 2154000, currency: "INR", accountNumberMasked: "FOLIO-XXXX-8890", provider: "SBI Mutual Fund", nomineeName: "Anita Sharma", discoveredDate: new Date("2024-04-02"), status: "CLAIMED" as const },
  { id: 106, regulator: "LIC", type: "Life Cover", amount: 743000, currency: "INR", accountNumberMasked: "POLICY-XXXX-2711", provider: "LIC Jeevan Anand", nomineeName: "Anita Sharma", discoveredDate: new Date("2024-03-30"), status: "READY_TO_SUBMIT" as const },
];

export const mockClaims = [
  { id: 201, assetId: 101, regulator: "RBI", status: "AI_VERIFICATION" as const, notes: "Awaiting final document review.", createdAt: new Date("2026-08-20"), updatedAt: new Date("2026-08-22"), submittedAt: null },
  { id: 202, assetId: 103, regulator: "EPFO", status: "DOCUMENTS_PENDING" as const, notes: "Bank statement required.", createdAt: new Date("2026-08-18"), updatedAt: new Date("2026-08-21"), submittedAt: null },
  { id: 203, assetId: 106, regulator: "LIC", status: "READY_TO_SUBMIT" as const, notes: "Packet prepared for self-reported submission.", createdAt: new Date("2026-08-10"), updatedAt: new Date("2026-08-18"), submittedAt: null },
];

export const mockNotifications = [
  { id: 301, title: "RBI claim verification completed", detail: "The claim packet is ready for your review.", tone: "success" },
  { id: 302, title: "EPFO document required", detail: "Add a recent bank or asset statement to continue.", tone: "warning" },
  { id: 303, title: "LIC claim packet ready", detail: "You can record your self-reported submission.", tone: "info" },
];

export const mockScenarios = [
  { id: 401, name: "A balanced 10-year path", amount: 500000, investmentType: "MUTUAL_FUND", years: 10, projectedValue: 1060000, createdAt: new Date("2026-08-22") },
  { id: 402, name: "A steady PPF horizon", amount: 300000, investmentType: "PPF", years: 7, projectedValue: 480000, createdAt: new Date("2026-08-20") },
];

export const investmentRates: Record<string, number> = { FD: 0.06, PPF: 0.071, MUTUAL_FUND: 0.1 };
