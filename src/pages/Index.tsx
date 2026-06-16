const Index = () => {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <iframe
        src="/landing.html"
        title="GlobaLeads22 - get 20 AI-curated leads for free"
        className="block h-full w-full border-0 bg-black"
      />
      <section className="sr-only" aria-label="GlobaLeads22 overview">
        <h1>Get 20 AI-curated leads for free</h1>
        <p>
          GlobaLeads22 helps agencies, freelancers, consultants, founders, and B2B
          sales teams get 20 free prospects researched by niche and location.
        </p>
        <p>
          Search a target market to find businesses with public contact data,
          likely decision-maker context, fit scoring, and visible opportunity
          signals for outreach.
        </p>
        <nav aria-label="Primary">
          <a href="https://app.globaleads22.com/">Get started</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </nav>
      </section>
    </main>
  );
};

export default Index;
