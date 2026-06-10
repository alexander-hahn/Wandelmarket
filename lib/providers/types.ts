export interface RawShopItem {
  /** Unique key scoped to this provider, e.g. "github:org/repo" or "nucleus:/path/to/ext" */
  providerKey: string;
  name: string;
  description: string;
  /** "app" | "isaac_sim_extension" | "website" | "project" */
  category: string;
  author: string;
  version?: string;
  downloadUrl?: string;
  repoUrl?: string;
  websiteUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  stars?: number;
  installInstructions?: string;
}

export interface SyncResult {
  provider: string;
  synced: number;
  error?: string;
}

export interface ShopItemProvider {
  /** Stable identifier shown in the admin UI */
  name: string;
  /** Returns true when required env vars are present */
  isEnabled(): boolean;
  /** Fetch all items from this backend */
  fetchItems(): Promise<RawShopItem[]>;
}
