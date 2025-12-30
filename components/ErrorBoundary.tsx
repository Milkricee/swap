'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="backdrop-blur-md bg-red-500/10 border-red-500/30 p-8 max-w-md w-full">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-16 h-16 mx-auto text-red-400" />
              <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
              <p className="text-white/70 text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                Reload App
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
