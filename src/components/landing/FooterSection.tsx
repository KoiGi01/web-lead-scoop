import { Target } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2 text-foreground">
          <Target className="h-5 w-5 text-primary" />
          <span className="font-semibold">LeadExtractor</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} LeadExtractor. Built for outreach teams.
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;
