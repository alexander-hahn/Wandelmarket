"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";

const FAVORITES_KEY = "wandelshop:favorites";
const FAVORITES_CHANGED_EVENT = "wandelshop:favorites:changed";

function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set<string>();
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set<string>();
    return new Set(ids.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeFavorites(next: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export default function FavoriteButton({
  itemId,
  size = "medium",
  onClick,
}: {
  itemId: string;
  size?: "small" | "medium" | "large";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    const update = () => setFavorites(readFavorites());
    update();

    window.addEventListener("storage", update);
    window.addEventListener(FAVORITES_CHANGED_EVENT, update as EventListener);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, update as EventListener);
    };
  }, []);

  const isFavorite = useMemo(() => favorites.has(itemId), [favorites, itemId]);

  const toggleFavorite = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);

    const next = new Set(favorites);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }

    setFavorites(next);
    writeFavorites(next);
  };

  return (
    <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
      <IconButton
        size={size}
        onClick={toggleFavorite}
        color={isFavorite ? "primary" : "default"}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
