const INPUT_PREVIEW_MAX_LENGTH = 300;

/**
 * Build a truncated preview of input text for UI display.
 * If text is shorter than max length, returns as-is.
 * Otherwise truncates and adds ellipsis.
 */
export function buildInputPreview(text: string): string {
  if (!text) return "";
  if (text.length <= INPUT_PREVIEW_MAX_LENGTH) return text;
  return text.slice(0, INPUT_PREVIEW_MAX_LENGTH) + "…";
}
