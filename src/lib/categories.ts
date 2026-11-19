/**
 * Normalizes rental inventory categories.
 * Combines "Mounts" and "Tripod" into "Mounts & Tripods".
 */
export function normalizeRentalCategory(cat: string | null | undefined): string {
  if (!cat) return "Equipment";
  const trimmed = cat.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === "mounts" ||
    lower === "mount" ||
    lower === "tripod" ||
    lower === "tripods" ||
    lower === "mounts & tripod" ||
    lower === "mounts & tripods" ||
    lower === "tripods & mounts"
  ) {
    return "Mounts & Tripods";
  }
  return trimmed;
}
