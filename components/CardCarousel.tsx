"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import type { ReactNode } from "react";

interface CardCarouselProps<T> {
  items: T[];
  index: number;
  onIndexChange: (nextIndex: number) => void;
  getItemKey: (item: T, absoluteIndex: number) => string;
  renderItem: (item: T, meta: { slotIndex: number; absoluteIndex: number }) => ReactNode;
  cardsPerView?: number;
  repeatToFill?: boolean;
  controlsMarginBottom?: number;
}

export default function CardCarousel<T>({
  items,
  index,
  onIndexChange,
  getItemKey,
  renderItem,
  cardsPerView = 2,
  repeatToFill = false,
  controlsMarginBottom = 0,
}: CardCarouselProps<T>) {
  const safeCardsPerView = Math.max(1, Math.floor(cardsPerView));
  const normalizedIndex = items.length === 0 ? 0 : ((index % items.length) + items.length) % items.length;
  const shouldScroll = items.length > safeCardsPerView;
  const gapSpacing = 2;
  const gapPx = gapSpacing * 8;

  const visibleEntries = useMemo(() => {
    if (items.length === 0) return [] as Array<{ item: T; absoluteIndex: number }>;

    if (!shouldScroll) {
      return items.map((item, absoluteIndex) => ({ item, absoluteIndex }));
    }

    const count = repeatToFill ? safeCardsPerView : Math.min(safeCardsPerView, items.length);
    return Array.from({ length: count }, (_, slotIndex) => {
      const absoluteIndex = (normalizedIndex + slotIndex) % items.length;
      return { item: items[absoluteIndex], absoluteIndex };
    });
  }, [items, normalizedIndex, repeatToFill, safeCardsPerView, shouldScroll]);

  if (items.length === 0) return null;

  const visibleSlots = shouldScroll ? safeCardsPerView : Math.max(1, visibleEntries.length);

  return (
    <>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          gap: gapSpacing,
          overflow: "hidden",
          minWidth: 0,
          mb: 1.25,
        }}
      >
        {visibleEntries.map(({ item, absoluteIndex }, slotIndex) => (
          <Box
            key={`${getItemKey(item, absoluteIndex)}-${slotIndex}`}
            sx={{
              flex: `0 0 calc((100% - ${(visibleSlots - 1) * gapPx}px) / ${visibleSlots})`,
              minWidth: 0,
            }}
          >
            {renderItem(item, { slotIndex, absoluteIndex })}
          </Box>
        ))}
      </Box>

      {shouldScroll && (
        <Stack direction="row" alignItems="center" sx={{ width: "100%", mb: controlsMarginBottom }}>
          <IconButton
            aria-label="Previous carousel item"
            onClick={() => onIndexChange((normalizedIndex - 1 + items.length) % items.length)}
            size="small"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>

          <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ flex: 1 }}>
            {items.map((item, idx) => (
              <Box
                key={getItemKey(item, idx)}
                component="button"
                type="button"
                onClick={() => onIndexChange(idx)}
                aria-label={`Show carousel item ${idx + 1}`}
                sx={{
                  width: idx === normalizedIndex ? 22 : 10,
                  height: 10,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: idx === normalizedIndex ? "primary.main" : "rgba(255,255,255,0.3)",
                  transition: "all 120ms ease",
                  p: 0,
                }}
              />
            ))}
          </Stack>

          <IconButton
            aria-label="Next carousel item"
            onClick={() => onIndexChange((normalizedIndex + 1) % items.length)}
            size="small"
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}
    </>
  );
}