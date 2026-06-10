import { Octokit } from "@octokit/rest";
import type { ShopItemProvider, RawShopItem } from "./types";

const ORG = process.env.GITHUB_ORG ?? "";
const TOPIC = process.env.GITHUB_TOPIC ?? "wandelshop";

interface WandelMarketManifest {
  name?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  version?: string;
  downloadUrl?: string;
  repoUrl?: string;
  websiteUrl?: string;
  tags?: string[];
  installInstructions?: string;
}

async function fetchManifest(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<WandelMarketManifest | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: "wandelshop.json" });
    if ("content" in data) {
      return JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    }
  } catch {
    // no manifest — fine
  }
  return null;
}

export const githubProvider: ShopItemProvider = {
  name: "github",

  isEnabled() {
    return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_ORG);
  },

  async fetchItems(): Promise<RawShopItem[]> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const { data } = await octokit.search.repos({
      q: `org:${ORG} topic:${TOPIC}`,
      per_page: 100,
    });

    const items: RawShopItem[] = [];

    for (const repo of data.items) {
      const owner = repo.owner?.login ?? ORG;
      const manifest = await fetchManifest(octokit, owner, repo.name);

      items.push({
        providerKey: `github:${repo.full_name}`,
        name: manifest?.name ?? repo.name,
        description: manifest?.description ?? repo.description ?? "No description provided.",
        category: manifest?.category ?? "project",
        author: owner,
        version: manifest?.version,
        downloadUrl: manifest?.downloadUrl ?? `https://github.com/${repo.full_name}/releases/latest`,
        repoUrl: manifest?.repoUrl ?? repo.html_url,
        websiteUrl: manifest?.websiteUrl,
        thumbnailUrl: manifest?.thumbnailUrl,
        tags: manifest?.tags ?? (repo.topics ?? []),
        stars: repo.stargazers_count ?? 0,
        installInstructions: manifest?.installInstructions,
      });
    }

    return items;
  },
};
