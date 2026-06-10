import { notFound } from "next/navigation";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import FavoriteButton from "@/components/FavoriteButton";
import ItemDetailTabs from "@/components/ItemDetailTabs";
import RelatedItemsCarousel from "@/components/RelatedItemsCarousel";
import ListingDiscussion from "@/components/ListingDiscussion";
import { CATEGORY_COLORS, CATEGORY_COMPANIONS, CATEGORY_LABELS } from "@/lib/categories";
import { getSessionUserByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  const currentUser = token ? await getSessionUserByToken(token) : null;

  const item = await prisma.shopItem.findUnique({ where: { id } });

  if (!item) notFound();

  const tags = parseTags(item.tags);
  const normalizedCurrentTags = new Set(tags.map((tag) => tag.trim().toLowerCase()));

  const candidates = await prisma.shopItem.findMany({
    where: { id: { not: item.id } },
    orderBy: [{ stars: "desc" }, { updatedAt: "desc" }],
    take: 80,
  });

  const relatedItems = candidates
    .map((candidate) => {
      const candidateTags = parseTags(candidate.tags);
      const sharedTagCount = candidateTags.reduce((count, tag) => {
        return normalizedCurrentTags.has(tag.trim().toLowerCase()) ? count + 1 : count;
      }, 0);

      const sameCategory = candidate.category === item.category ? 1 : 0;
      const companionCategory = CATEGORY_COMPANIONS[item.category]?.includes(candidate.category) ? 1 : 0;
      // Co-install proxy: category affinity and installable metadata overlap.
      const coInstallSignal = sameCategory + companionCategory + (candidate.downloadUrl && item.downloadUrl ? 1 : 0);
      const score = sharedTagCount * 5 + coInstallSignal * 2 + Math.min(candidate.stars, 100) / 20;

      return {
        id: candidate.id,
        name: candidate.name,
        description: candidate.description,
        category: candidate.category,
        author: candidate.author,
        stars: candidate.stars,
        thumbnailUrl: candidate.thumbnailUrl,
        thumbnailOverride: candidate.thumbnailOverride,
        tags: candidateTags,
        score,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const comments = await prisma.$queryRaw<
    Array<{ id: string; userId: string; authorName: string; message: string; createdAt: Date }>
  >`
    SELECT "id", "userId", "authorName", "message", "createdAt"
    FROM "ListingComment"
    WHERE "itemId" = ${item.id}
    ORDER BY "createdAt" DESC
  `;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <Button startIcon={<ArrowBackIcon />} sx={{ mb: 2 }} color="inherit">
          Back
        </Button>
      </Link>

      {(item.thumbnailOverride ?? item.thumbnailUrl) && (
        <Box
          component="img"
          src={(item.thumbnailOverride ?? item.thumbnailUrl)!}
          alt={item.name}
          sx={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 2, mb: 3 }}
        />
      )}

      <Stack spacing={1} mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={CATEGORY_LABELS[item.category] ?? item.category}
            variant="outlined"
            sx={{ borderColor: CATEGORY_COLORS[item.category] ?? "#4fc3f7", color: CATEGORY_COLORS[item.category] ?? "#4fc3f7", fontWeight: 600 }}
          />
          {item.stars > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StarIcon sx={{ fontSize: 16, color: "warning.main" }} />
              <Typography variant="body2">{item.stars}</Typography>
            </Stack>
          )}
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          {item.name}
        </Typography>
        <FavoriteButton itemId={item.id} />
      </Stack>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        by {item.author}
        {item.version && ` · v${item.version}`}
        {item.source === "github" && item.providerKey && ` · ${item.providerKey.replace("github:", "")}`}
      </Typography>

      <ItemDetailTabs
        description={item.description}
        category={item.category}
        websiteUrl={item.websiteUrl}
        downloadUrl={item.downloadUrl}
        repoUrl={item.repoUrl}
        source={item.source}
        installInstructions={item.installInstructions}
      />

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Related
      </Typography>

      <RelatedItemsCarousel items={relatedItems} />

      <Divider sx={{ my: 3 }} />

      <ListingDiscussion
        itemId={item.id}
        currentUserId={currentUser?.id ?? null}
        initialComments={comments.map((comment) => ({
          ...comment,
          createdAt: new Date(comment.createdAt).toISOString(),
        }))}
      />
    </Container>
  );
}
