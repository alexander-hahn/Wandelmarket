import type { ShopItemProvider, RawShopItem } from "./types";

/**
 * Omniverse Extension Registry provider.
 *
 * Reads the index.json from an Omniverse/Isaac Sim extension registry.
 * The index is a flat object keyed by "{extensionName}-{version}", each entry
 * having a `package` field with title, version, category, description, etc.
 *
 * Extensions with multiple versions are deduplicated — only the latest version
 * per unique title is shown in the shop.
 *
 * Required env vars:
 *   NUCLEUS_REGISTRY_INDEX_URL  — direct URL to index.json
 *
 * Optional:
 *   NUCLEUS_REGISTRY_URL        — base URL of the registry web UI (used for linking)
 *   NUCLEUS_TOKEN               — Bearer token if the registry requires auth
 */

const INDEX_URL = process.env.NUCLEUS_REGISTRY_INDEX_URL ?? "";
const REGISTRY_URL = (process.env.NUCLEUS_REGISTRY_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.NUCLEUS_TOKEN;

interface RegistryPackage {
  title?: string;
  version?: string;
  category?: string;
  description?: string;
  keywords?: string[];
  repository?: string;
  author?: string;
  authors?: string[];
  changelog?: string;
  readme?: string;
}

interface RegistryEntry {
  registryProviderName?: string;
  package?: RegistryPackage;
}

type RegistryIndex = Record<string, RegistryEntry>;

/** Simple semver-like comparison — returns positive if a > b */
function compareVersions(a: string, b: string): number {
  const norm = (v: string) =>
    v.replace(/[^0-9.]/g, ".").split(".").filter(Boolean).map(Number);
  const pa = norm(a);
  const pb = norm(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export const nucleusProvider: ShopItemProvider = {
  name: "nucleus",

  isEnabled() {
    return Boolean(INDEX_URL);
  },

  async fetchItems(): Promise<RawShopItem[]> {
    const headers: HeadersInit = TOKEN
      ? { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" }
      : { Accept: "application/json" };

    const res = await fetch(INDEX_URL, { headers });
    if (!res.ok) {
      throw new Error(`Registry index fetch failed: ${res.status} ${res.statusText}`);
    }

    const index: RegistryIndex = await res.json();

    // Group entries by package title, keep the latest version per extension
    const byTitle = new Map<string, { entry: RegistryEntry; version: string }>();

    for (const entry of Object.values(index)) {
      const pkg = entry.package;
      if (!pkg?.title) continue;

      const version = pkg.version ?? "0";
      const existing = byTitle.get(pkg.title);

      if (!existing || compareVersions(version, existing.version) > 0) {
        byTitle.set(pkg.title, { entry, version });
      }
    }

    const items: RawShopItem[] = [];

    for (const [title, { entry, version }] of byTitle) {
      const pkg = entry.package!;
      const author =
        entry.registryProviderName ??
        (Array.isArray(pkg.authors) ? pkg.authors.join(", ") : pkg.author) ??
        "Internal";

      const keywords: string[] = pkg.keywords ?? [];
      if (pkg.category) keywords.unshift(pkg.category);

      // Link to the registry web UI page if available
      const registryPageUrl = REGISTRY_URL
        ? `${REGISTRY_URL}#${encodeURIComponent(title)}`
        : undefined;

      items.push({
        providerKey: `nucleus:${title}`,
        name: title,
        description: pkg.description ?? `Isaac Sim extension — ${title}`,
        category: "isaac_sim_extension",
        author,
        version,
        repoUrl: pkg.repository ?? registryPageUrl,
        websiteUrl: registryPageUrl,
        tags: keywords,
        installInstructions: [
          `## Installing from the Omniverse Registry`,
          ``,
          `1. Open **Isaac Sim** and go to **Window → Extensions**`,
          `2. Click the ☰ menu → **Add Extension Search Path**`,
          `3. Add the registry URL:`,
          `\`\`\``,
          INDEX_URL.replace(/\/index\.json$/, ""),
          `\`\`\``,
          `4. Search for **${title}** in the Extensions panel and enable it.`,
          pkg.changelog ? `\n## Changelog\n\n${pkg.changelog}` : "",
        ]
          .filter((l) => l !== "")
          .join("\n"),
      });
    }

    return items;
  },
};
