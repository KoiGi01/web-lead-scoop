import React from "react";
import GlobaLeadsLogo from "@/components/icons/GlobaLeadsLogo";

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
          <div className="max-w-md rounded-2xl bg-[#0F1115] border border-white/10 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#F7931A]/40 bg-[#F7931A]/10">
                <GlobaLeadsLogo className="h-8 w-8 text-[#F7931A]" size={32} />
              </div>
            </div>
            <h2 className="font-heading text-xl font-bold text-white mb-3">
              Something went wrong
            </h2>
            <p className="font-mono-data text-xs text-[#94A3B8] mb-4 break-words">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-btc px-6 py-2.5 font-mono-data text-xs font-bold uppercase tracking-wider text-white rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
