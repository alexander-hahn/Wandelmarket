export const CATEGORY_OPTIONS = [
  { value: "app", label: "App" },
  { value: "isaac_sim_extension", label: "Isaac Sim Extension" },
  { value: "website", label: "Website" },
  { value: "project", label: "Project" },
  { value: "3d_print", label: "3D Printing" },
  { value: "3d_asset", label: "3D Asset" },
] as const;

export type CategoryValue = (typeof CATEGORY_OPTIONS)[number]["value"];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((category) => [category.value, category.label])
);

export const CATEGORY_COLORS: Record<string, string> = {
  app: "#4fc3f7",
  isaac_sim_extension: "#81c784",
  website: "#ce93d8",
  project: "#ffb74d",
  "3d_print": "#ef9a9a",
  "3d_asset": "#80cbc4",
};

export const CATEGORY_COMPANIONS: Record<string, string[]> = {
  app: ["isaac_sim_extension", "project"],
  isaac_sim_extension: ["app", "project"],
  website: ["project", "app"],
  project: ["app", "website", "isaac_sim_extension"],
  "3d_print": ["project", "3d_asset", "app"],
  "3d_asset": ["project", "3d_print", "app"],
};
