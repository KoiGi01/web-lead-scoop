export function useTypewriter(text: string, progress: number): string {
  const clamped = Math.max(0, Math.min(1, progress));
  const charCount = Math.ceil(clamped * text.length);
  return text.slice(0, charCount);
}
