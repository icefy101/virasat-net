// Archive of Trust: UI reads through a service boundary, keeping mock discovery replaceable by REST later.
import { mockAssets, mockClaims, mockDocuments, mockNotifications, mockRegulators, mockScenarios, mockUser } from "@/data/mockData";
import type { Asset, Claim, Document, FinTwinScenario, Notification, Regulator, User } from "@/types";

export interface DataService {
  getAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  getRegulators(): Promise<Regulator[]>;
  getClaims(): Promise<Claim[]>;
  getClaim(id: string): Promise<Claim | undefined>;
  getDocuments(claimId?: string): Promise<Document[]>;
  getNotifications(): Promise<Notification[]>;
  getUserProfile(): Promise<User>;
  getScenarios(): Promise<FinTwinScenario[]>;
  uploadDocument(claimId: string, documentName: string, filename: string): Promise<Document>;
  prepareClaim(claimId: string): Promise<Claim | undefined>;
  markClaimSubmitted(claimId: string): Promise<Claim | undefined>;
  saveScenario(scenario: FinTwinScenario): Promise<FinTwinScenario>;
}

const sleep = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

let claimsState = [...mockClaims];
let documentsState = [...mockDocuments];
let scenariosState = [...mockScenarios];

export const MockDataService: DataService = {
  async getAssets() { await sleep(); return mockAssets; },
  async getAsset(id) { await sleep(); return mockAssets.find((asset) => asset.id === id); },
  async getRegulators() { await sleep(); return mockRegulators; },
  async getClaims() { await sleep(); return claimsState; },
  async getClaim(id) { await sleep(); return claimsState.find((claim) => claim.id === id); },
  async getDocuments(claimId) { await sleep(); return claimId ? documentsState.filter((doc) => doc.claimId === claimId) : documentsState; },
  async getNotifications() { await sleep(); return mockNotifications; },
  async getUserProfile() { await sleep(); return mockUser; },
  async getScenarios() { await sleep(); return scenariosState; },
  async uploadDocument(claimId, documentName, filename) {
    await sleep(280);
    const newDocument: Document = {
      id: `doc_${Date.now()}`,
      claimId,
      name: documentName,
      type: documentName,
      status: "Processing",
      uploadedDate: "Just now",
      filename,
      required: true,
    };
    documentsState = [newDocument, ...documentsState];
    claimsState = claimsState.map((claim) => claim.id === claimId ? { ...claim, status: "AI Verification", progress: Math.max(claim.progress, 58), documentsCount: Math.min(claim.documentsTotal, claim.documentsCount + 1), lastUpdated: "Just now" } : claim);
    return newDocument;
  },
  async prepareClaim(claimId) {
    await sleep(220);
    claimsState = claimsState.map((claim) => claim.id === claimId ? { ...claim, status: "Ready to Submit", progress: 92, lastUpdated: "Just now" } : claim);
    return claimsState.find((claim) => claim.id === claimId);
  },
  async markClaimSubmitted(claimId) {
    await sleep(220);
    claimsState = claimsState.map((claim) => claim.id === claimId ? { ...claim, status: "Submitted", progress: 100, lastUpdated: "Just now" } : claim);
    return claimsState.find((claim) => claim.id === claimId);
  },
  async saveScenario(scenario) {
    await sleep(180);
    scenariosState = [scenario, ...scenariosState.filter((item) => item.id !== scenario.id)];
    return scenario;
  },
};
