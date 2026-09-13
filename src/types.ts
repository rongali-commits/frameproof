export type VersionTag = `v${number}`;

export type DecisionStatus = "pending" | "approved" | "changes_requested";

export interface AssetVersion {
  id: string;
  version: VersionTag;
  label: string;
  src: string;
  uploadedAt: string;
  isUploaded?: boolean;
  blobId?: string;
}

export interface Asset {
  id: string;
  name: string;
  subtitle: string;
  versions: AssetVersion[];
}

export interface Pin {
  id: string;
  x: number;
  y: number;
}

export interface Comment {
  id: string;
  assetId: string;
  versionId: string;
  pin: Pin;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
}

export interface Reply {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface DecisionRecord {
  id: string;
  assetId: string;
  versionId: string;
  status: DecisionStatus;
  reviewer: string;
  note: string;
  createdAt: string;
}

export interface DemoState {
  schemaVersion: 2;
  assets: Asset[];
  comments: Comment[];
  decisions: DecisionRecord[];
  customVersionBlobs: Record<string, string>;
}
