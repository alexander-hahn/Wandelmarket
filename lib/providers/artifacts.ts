import type { ShopItemProvider, RawShopItem } from "./types";

/**
 * Artifact storage provider stub.
 *
 * Reads a manifest JSON file from an HTTP-accessible artifact storage
 * (S3, Nexus, Artifactory, a simple nginx-served folder, etc.).
 *
 * The manifest at ARTIFACTS_MANIFEST_URL must be a JSON array of RawShopItem objects:
 * [
 *   {
 *     "providerKey": "artifacts:my-tool-v1.2.0",
 *     "name": "My Tool",
 *     "description": "...",
 *     "category": "app",
 *     "author": "team-name",
 *     "version": "1.2.0",
 *     "downloadUrl": "https://artifacts.company.com/my-tool-v1.2.0.zip",
 *     "tags": ["python", "cli"]
 *   }
 * ]
 *
 * Required env vars:
 *   ARTIFACTS_MANIFEST_URL — URL to the JSON manifest file
 *
 * Optional:
 *   ARTIFACTS_TOKEN        — Bearer token if the endpoint is authenticated
 */

const MANIFEST_URL = process.env.ARTIFACTS_MANIFEST_URL ?? "";
const TOKEN = process.env.ARTIFACTS_TOKEN;

export const artifactsProvider: ShopItemProvider = {
  name: "artifacts",

  isEnabled() {
    return Boolean(MANIFEST_URL);
  },

  async fetchItems(): Promise<RawShopItem[]> {
    const headers: HeadersInit = TOKEN
      ? { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" }
      : { Accept: "application/json" };

    const res = await fetch(MANIFEST_URL, { headers });
    if (!res.ok) {
      throw new Error(`Artifacts manifest fetch failed: ${res.status} ${res.statusText}`);
    }

    const items: RawShopItem[] = await res.json();

    // Ensure providerKey is scoped
    return items.map((item) => ({
      ...item,
      providerKey: item.providerKey.startsWith("artifacts:")
        ? item.providerKey
        : `artifacts:${item.providerKey}`,
    }));
  },
};
