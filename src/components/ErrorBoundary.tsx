import React from "react";
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md rounded-2xl bg-petrol-800 border border-cream-100/10 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-wine-500/40 bg-wine-700/10">
                <GlobaLeadsLogo size="sm" theme="dark" showMark={true} className="opacity-90" />
              </div>
            </div>
            <h2 className="font-heading text-xl font-bold text-cream-100 mb-3">
              Something went wrong
            </h2>
            <p className="font-mono text-xs text-cream-300 mb-4 break-words">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button
              variant="accent"
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
