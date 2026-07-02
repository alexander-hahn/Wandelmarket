export interface AuthUser {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
}

export function getNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "").toUpperCase() || "U";
}

export function getUserInitials(user: AuthUser): string {
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();

  if (first && last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }

  if (first) {
    return first.slice(0, 2).toUpperCase();
  }

  if (last) {
    return last.slice(0, 2).toUpperCase();
  }

  const displayName = (user.displayName ?? "").trim();
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || "U";
  }

  const emailLocalPart = (user.email ?? "").trim().split("@")[0] ?? "";
  if (emailLocalPart) {
    const normalized = emailLocalPart.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    if (normalized) {
      const parts = normalized.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
      }
      return parts[0]?.slice(0, 2).toUpperCase() || "U";
    }
  }

  return "U";
}
