import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { requireRoles } from "@/lib/auth";

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

function parseGitHubRepoUrl(input: string) {
  try {
    const url = new URL(input.trim());
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

async function fetchManifest(octokit: Octokit, owner: string, repo: string): Promise<WandelMarketManifest | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: "wandelshop.json" });
    if ("content" in data && typeof data.content === "string") {
      const raw = Buffer.from(data.content, "base64").toString("utf-8");
      return JSON.parse(raw) as WandelMarketManifest;
    }
  } catch {
    // Manifest file is optional.
  }

  return null;
}

export async function POST(req: Request) {
  const auth = await requireRoles(req, ["member", "moderator", "admin"]);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const repoUrl = typeof (body as { repoUrl?: unknown }).repoUrl === "string"
    ? (body as { repoUrl: string }).repoUrl
    : "";

  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Provide a valid GitHub repository URL" }, { status: 400 });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });

  try {
    const { data: repo } = await octokit.repos.get({ owner: parsed.owner, repo: parsed.repo });
    const manifest = await fetchManifest(octokit, parsed.owner, parsed.repo);

    const prefill = {
      name: manifest?.name ?? repo.name,
      description: manifest?.description ?? repo.description ?? "",
      category: manifest?.category ?? "project",
      author: parsed.owner,
      version: manifest?.version ?? "",
      downloadUrl: manifest?.downloadUrl ?? `https://github.com/${parsed.owner}/${parsed.repo}/releases/latest`,
      repoUrl: manifest?.repoUrl ?? repo.html_url,
      websiteUrl: manifest?.websiteUrl ?? repo.homepage ?? "",
      thumbnailUrl: manifest?.thumbnailUrl ?? "",
      tags: manifest?.tags ?? repo.topics ?? [],
      installInstructions: manifest?.installInstructions ?? "",
    };

    return NextResponse.json(prefill);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import repository metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}