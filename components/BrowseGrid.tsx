"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import SearchIcon from "@mui/icons-material/Search";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import ItemCard from "@/components/ItemCard";
import CoinPurseIcon from "@/components/icons/CoinPurseIcon";
import type { ShopItem } from "@prisma/client";

const FAVORITES_KEY = "wandelshop:favorites";
const FAVORITES_CHANGED_EVENT = "wandelshop:favorites:changed";

export default function BrowseGrid({
  items,
  initialCategory = "all",
}: {
  items: Array<ShopItem>;
  initialCategory?: string;
  counts?: Record<string, number>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    const updateFavorites = () => {
      try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (!raw) {
          setFavorites(new Set<string>());
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
        setFavorites(new Set<string>(ids));
      } catch {
        setFavorites(new Set<string>());
      }
    };

    updateFavorites();
    window.addEventListener("storage", updateFavorites);
    window.addEventListener(FAVORITES_CHANGED_EVENT, updateFavorites as EventListener);

    return () => {
      window.removeEventListener("storage", updateFavorites);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, updateFavorites as EventListener);
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        initialCategory === "all"
          ? true
          : initialCategory === "favorites"
          ? favorites.has(item.id)
          : item.category === initialCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, initialCategory, search, favorites]);

  const handleRequestItem = () => {
    const categoryParam = initialCategory === "favorites" ? "project" : initialCategory;
    router.push(`/bounties?section=create-bounty&requestedCategory=${categoryParam}`);
  };

  const handleCreateListing = () => {
    router.push("/listings/new");
  };

  return (
    <>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search by name, author, or description…"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<CoinPurseIcon />}
            onClick={handleRequestItem}
            sx={{
              borderColor: "#b58eec",
              color: "#b58eec",
              "&:hover": {
                borderColor: "#b58eec",
                backgroundColor: "#b58eec08",
              },
            }}
          >
            Issue a Bounty
          </Button>
          <Button
            variant="contained"
            fullWidth
            startIcon={<PlaylistAddIcon />}
            onClick={handleCreateListing}
          >
            Create Listing
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: "center" }}>
          No items found.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((item) => (
            <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <ItemCard item={item} />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
