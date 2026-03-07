/**
 * Utilities for markdown heading level manipulation.
 *
 * Since the .md task format uses #/##/### as structural markers,
 * user-written headings within content sections must be "elevated"
 * (pushed deeper) on save so they don't collide with structural markers,
 * and "demoted" (pulled shallower) on load so the user sees normal levels.
 *
 * Elevation offsets per section:
 *   Description:        +1  (user # → file ##)
 *   Issue description:  +2  (user # → file ###)
 *   Issue solution:     +3  (user # → file ####)
 *   Question answer:    +3  (user # → file ####)
 *   Log body:           +2  (user # → file ###)
 */

const HEADING_RE = /^(#{1,6})\s/;

/**
 * Elevate all headings in a markdown string by `levels` levels.
 * E.g. with levels=1: `# Foo` → `## Foo`, `## Bar` → `### Bar`
 */
export function elevateHeadings(markdown: string, levels: number): string {
  if (levels === 0) return markdown;
  return markdown.replace(
    new RegExp(HEADING_RE.source, "gm"),
    (_match, hashes: string) => "#".repeat(Math.min(6, hashes.length + levels)) + " ",
  );
}

/**
 * Demote all headings in a markdown string by `levels` levels.
 * E.g. with levels=1: `## Foo` → `# Foo`, `### Bar` → `## Bar`
 */
export function demoteHeadings(markdown: string, levels: number): string {
  if (levels === 0) return markdown;
  return markdown.replace(
    new RegExp(HEADING_RE.source, "gm"),
    (_match, hashes: string) => "#".repeat(Math.max(1, hashes.length - levels)) + " ",
  );
}
