import { describe, it, expect } from "vitest";
import { buildPromoCode } from "../../supabase/functions/_shared/promoCode";

describe("buildPromoCode", () => {
  it("starts with the WC- prefix and is 11 chars total", () => {
    const code = buildPromoCode("abcdefghij");
    expect(code.startsWith("WC-")).toBe(true);
    expect(code.length).toBe(11);
  });

  it("is deterministic for a given seed", () => {
    expect(buildPromoCode("abcdefghij")).toBe(buildPromoCode("abcdefghij"));
  });

  it("only uses unambiguous uppercase characters", () => {
    const code = buildPromoCode("zzzzzzzzzz").slice(3);
    expect(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(code)).toBe(true);
  });

  it("produces different codes without a seed", () => {
    expect(buildPromoCode()).not.toBe(buildPromoCode());
  });
});
