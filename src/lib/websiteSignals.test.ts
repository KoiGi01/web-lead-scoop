import { describe, it, expect } from "vitest";
import { buildWebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

const homepage = (html: string, links: string[] = [], url = "https://acme.com") => ({ url, html, links });

describe("buildWebsiteSignals", () => {
  it("captures title, meta, and homepage text length from the homepage", () => {
    const html = `<html><head><title>Acme Dental</title><meta name="description" content="Best dental care"></head><body><p>${"word ".repeat(50)}</p></body></html>`;
    const signals = buildWebsiteSignals({ pages: [homepage(html)], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.title).toBe("Acme Dental");
    expect(signals.metaDescription).toBe("Best dental care");
    expect(signals.homepageTextLength).toBeGreaterThan(100);
    expect(signals.pagesScanned).toEqual(["https://acme.com"]);
  });

  it("detects booking links and CTA texts", () => {
    const html = `<a href="https://calendly.com/acme">Book now</a><a href="/services">Our services</a><button>Get a free quote</button>`;
    const signals = buildWebsiteSignals({ pages: [homepage(html, ["https://calendly.com/acme", "https://acme.com/services"])], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.bookingLinks.some(l => l.includes("calendly.com"))).toBe(true);
    expect(signals.ctaTexts.join(" ").toLowerCase()).toContain("quote");
  });

  it("detects a contact form", () => {
    const html = `<form action="/send"><input type="email" name="email"><textarea></textarea></form>`;
    const signals = buildWebsiteSignals({ pages: [homepage(html)], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.contactFormFound).toBe(true);
  });

  it("flags generic-inbox-only when all emails are generic", () => {
    const signals = buildWebsiteSignals({ pages: [homepage("<p>hi</p>")], emails: ["info@acme.com", "contact@acme.com"], socialLinks: [], contactPageFound: false });
    expect(signals.hasGenericInboxOnly).toBe(true);
  });

  it("does NOT flag generic-inbox-only when a person inbox exists", () => {
    const signals = buildWebsiteSignals({ pages: [homepage("<p>hi</p>")], emails: ["info@acme.com", "jane.doe@acme.com"], socialLinks: [], contactPageFound: false });
    expect(signals.hasGenericInboxOnly).toBe(false);
  });

  it("detects tech stack and ssl from the homepage", () => {
    const html = `<meta name="generator" content="WordPress 6.2"><link href="/wp-content/themes/x/style.css">`;
    const signals = buildWebsiteSignals({ pages: [homepage(html, [], "https://acme.com")], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.techStack).toContain("wordpress");
    expect(signals.ssl.valid).toBe(true);
  });

  it("marks ssl invalid for http urls", () => {
    const signals = buildWebsiteSignals({ pages: [homepage("<p>hi</p>", [], "http://acme.com")], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.ssl.valid).toBe(false);
  });
});
