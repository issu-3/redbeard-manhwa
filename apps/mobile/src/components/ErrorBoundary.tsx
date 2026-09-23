import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else {
      window.history.back();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-full bg-brand-bg text-brand-text">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <button onClick={this.handleGoBack} className="text-brand-text">
              <ArrowLeft size={24} />
            </button>
            <span className="font-semibold text-lg">Error</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
            <div className="rounded-full bg-red-500/10 p-4">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-brand-text">Something went wrong</h2>
            <p className="text-sm text-brand-secondary max-w-xs">
              An unexpected error occurred while loading this page. Please try again.
            </p>
            {this.state.error && (
              <p className="text-xs text-brand-secondary/60 font-mono max-w-xs break-all mt-1">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={this.handleGoBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-brand-text bg-white/5 text-sm font-medium active:scale-95 transition-transform"
              >
                <ArrowLeft size={16} />
                Go Back
              </button>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium active:scale-95 transition-transform"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
