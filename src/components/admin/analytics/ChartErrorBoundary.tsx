'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  chartName: string;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ChartErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the underlying error to the server console (or client console in this case)
    console.error(`[Chart Error] ${this.props.chartName}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-[300px] flex flex-col items-center justify-center text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <h3 className="text-sm font-bold">Failed to load chart</h3>
          <p className="text-xs text-red-400 mt-1 max-w-xs break-words">
            {this.state.errorMsg}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
