export type EvidenceSource = "onchain_observed" | "project_reported" | "third_party";
export type EvidenceStatus = "verified" | "observed" | "reported" | "unverified" | "stale" | "alert";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  chainId: number;
  tokenAddress?: string | null;
}

export interface EvidenceRecord {
  id: string;
  projectId: string;
  claimType: string;
  title: string;
  description?: string | null;
  sourceType: EvidenceSource;
  status: EvidenceStatus;
  sourceUri?: string | null;
  transactionHash?: string | null;
  blockNumber?: number | null;
  observedAt: string;
  validUntil?: string | null;
  payload: Record<string, unknown>;
}