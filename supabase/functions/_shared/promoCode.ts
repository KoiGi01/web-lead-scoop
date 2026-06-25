const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LEN = 8;

export function buildPromoCode(seed?: string): string {
  let body = "";
  if (seed) {
    // Deterministic mapping from the seed string (used in tests).
    for (let i = 0; i < CODE_LEN; i++) {
      const c = seed.charCodeAt(i % seed.length) + i;
      body += ALPHABET[c % ALPHABET.length];
    }
  } else {
    const bytes = new Uint8Array(CODE_LEN);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < CODE_LEN; i++) {
      body += ALPHABET[bytes[i] % ALPHABET.length];
    }
  }
  return `WC-${body}`;
}
