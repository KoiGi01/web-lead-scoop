import React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import GlobaLeadsLogo from "./icons/GlobaLeadsLogo";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030304] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-[#0F1115] border border-white/10 rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-[#ff4757]/10 border border-[#ff4757]/30 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-[#ff4757]" />
              </div>
            </div>

            <div className="mb-4">
              <GlobaLeadsLogo className="h-8 w-8 mx-auto text-[#F7931A] mb-4" size={32} />
              <h1 className="text-2xl font-heading font-bold text-white mb-2">
                Oops!
              </h1>
              <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">
                Something went wrong. Our team has been notified. Please try reloading the page.
              </p>
              {this.state.error && (
                <p className="text-[10px] font-mono text-[#ff4757]/70 bg-[#ff4757]/5 rounded p-3 text-left mb-4 overflow-auto max-h-32">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <button
              onClick={this.resetError}
              className="btn-btc w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm font-bold uppercase tracking-widest text-white"
            >
              <RotateCw className="h-4 w-4" />
              Reload Page
            </button>

            <p className="text-[10px] text-[#94A3B8]/50 mt-4 font-mono">
              Error ID: {new Date().toISOString()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
