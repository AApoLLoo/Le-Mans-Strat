import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallbackLabel?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[ErrorBoundary${this.props.fallbackLabel ? ` - ${this.props.fallbackLabel}` : ''}]`, error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full flex flex-col items-center justify-center gap-4 bg-slate-900/50 rounded-xl p-8 text-center">
                    <AlertTriangle size={32} className="text-red-500" />
                    <div>
                        <h3 className="text-white font-bold text-sm mb-1">
                            {this.props.fallbackLabel || 'View'} crashed
                        </h3>
                        <p className="text-slate-400 text-xs max-w-sm">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-bold transition-colors"
                    >
                        <RotateCcw size={14} /> Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
