/**
 * Shared formatting utilities for person display.
 */

/**
 * Compute uppercase dot-separated initials from a full name.
 * e.g., "Björn Schmidt" → "B.S"
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join(".")
    .toUpperCase();
}
