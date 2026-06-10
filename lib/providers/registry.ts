import { prisma } from "@/lib/db";
import type { ShopItemProvider, SyncResult } from "./types";
import { githubProvider } from "./github";
import { nucleusProvider } from "./nucleus";
import { artifactsProvider } from "./artifacts";

const ALL_PROVIDERS: ShopItemProvider[] = [
  githubProvider,
  nucleusProvider,
  artifactsProvider,
];

export async function syncAllProviders(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const provider of ALL_PROVIDERS) {
    if (!provider.isEnabled()) {
      results.push({ provider: provider.name, synced: 0, error: "Not configured" });
      continue;
    }

    try {
      const items = await provider.fetchItems();

      for (const item of items) {
        const syncedItem = await prisma.shopItem.upsert({
          where: { providerKey: item.providerKey },
          update: {
            name: item.name,
            description: item.description,
            category: item.category,
            author: item.author,
            version: item.version ?? null,
            downloadUrl: item.downloadUrl ?? null,
            repoUrl: item.repoUrl ?? null,
            websiteUrl: item.websiteUrl ?? null,
            thumbnailUrl: item.thumbnailUrl ?? null,
            tags: JSON.stringify(item.tags ?? []),
            stars: item.stars ?? 0,
            source: provider.name,
            installInstructions: item.installInstructions ?? null,
            visibility: "members",
            updatedAt: new Date(),
          },
          create: {
            name: item.name,
            description: item.description,
            category: item.category,
            author: item.author,
            version: item.version ?? null,
            downloadUrl: item.downloadUrl ?? null,
            repoUrl: item.repoUrl ?? null,
            websiteUrl: item.websiteUrl ?? null,
            thumbnailUrl: item.thumbnailUrl ?? null,
            tags: JSON.stringify(item.tags ?? []),
            stars: item.stars ?? 0,
            source: provider.name,
            providerKey: item.providerKey,
            installInstructions: item.installInstructions ?? null,
            visibility: "members",
          },
        });

        await prisma.$executeRaw`
          DELETE FROM "ShopItemTeam"
          WHERE "itemId" = ${syncedItem.id}
        `;
      }

      results.push({ provider: provider.name, synced: items.length });
    } catch (err) {
      results.push({
        provider: provider.name,
        synced: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

export { ALL_PROVIDERS };
