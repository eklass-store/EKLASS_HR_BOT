// ============================================================
// src/utils/markdown.ts — Markdown Escaping Helpers
// ============================================================

/**
 * Escapes characters that are special in Telegram's legacy Markdown parse_mode
 * to prevent 'can\'t parse entities' errors when rendering user input.
 * BUG-J FIX: تقبل null | undefined بأمان
 */
export function escapeMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/([_*`\[])/g, '\\$1');
}
