export const ROTATIONS = [
  "rotate-0 sm:rotate-[-1.5deg]",
  "rotate-0 sm:rotate-[1.5deg]",
  "rotate-0 sm:rotate-[-1deg]",
  "rotate-0 sm:rotate-[2deg]",
  "rotate-0 sm:rotate-[-2deg]",
  "rotate-0 sm:rotate-[1deg]",
];

export const TAPES = ["washi-tape-coral", "washi-tape-sage", "washi-tape-butter"];

export const PHOTO_ASPECTS: Record<"portrait" | "landscape" | "square", string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

export function formatTimeAgo(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}
