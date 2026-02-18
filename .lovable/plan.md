

# Local Lead Extractor

A one-time lead generation tool that finds local businesses and extracts their contact details into a downloadable Excel file.

## How It Works

1. **User enters search criteria** — keyword (e.g. "plumber"), location (e.g. "Miami, FL"), and optional radius
2. **App queries Google Places API** to find matching businesses (name, address, phone, website, category)
3. **For each business with a website**, Firecrawl scrapes the site (homepage, /contact, /about — max 5 pages) to extract emails and WhatsApp links
4. **Results are compiled into a downloadable XLSX file**

## Pages & UI

### Single Page — Lead Extractor
- **Title**: "Local Lead Extractor"
- **Input form**: Keyword, Location, Radius (optional, in km)
- **"Generate Leads" button**
- **Progress section**: Shows current status (e.g. "Searching businesses... Found 18 results... Scanning websites 5/18...")
- **Download button**: Appears when processing completes, downloads an XLSX file
- **Error handling**: Friendly inline messages for API failures; processing continues past individual site errors

## Output File (XLSX)
Columns: Business Name, Category, Address, Phone (Maps), Website, Email, WhatsApp, Contact Page Found (Yes/No)

## Backend (Edge Functions)

### 1. `search-places` — Google Places API
- Accepts keyword, location, optional radius
- Returns list of businesses with name, address, phone, website, category, place ID
- Requires user's Google Places API key (stored as a secret)

### 2. `extract-contacts` — Website Crawling via Firecrawl
- For each business URL, scrapes up to 5 pages (homepage + /contact + /about + linked pages)
- Uses regex to extract emails (mailto, visible, obfuscated) and WhatsApp links (wa.me, whatsapp.com)
- Has per-site timeout and error handling — skips broken/slow sites
- Returns extracted contact data

## Setup Required
- **Google Places API key**: I'll guide you through obtaining one from Google Cloud Console (free tier available with $200/month credit)
- **Firecrawl connector**: Will be connected for website crawling

## Design
- Minimalist, utility-focused interface
- No auth, no dashboards, no accounts
- Single-purpose tool: input → process → download

