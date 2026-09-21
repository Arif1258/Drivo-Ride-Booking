import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Drivo Uncaught React Exception caught by ErrorBoundary:", error, errorInfo);
    }

    handleRefresh = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/home';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                        <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white tracking-tight">Something went wrong with the ride display</h2>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                An unexpected UI glitch occurred, but your active ride and booking data remain safe in the cloud.
                            </p>
                            {this.state.error?.message && (
                                <p className="text-[11px] font-mono text-rose-400/90 bg-rose-950/40 border border-rose-800/30 p-2.5 rounded-xl text-left overflow-x-auto break-all">
                                    {this.state.error.message}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                onClick={this.handleRefresh}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh Ride
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs border border-slate-700 transition-all"
                            >
                                <Home className="h-4 w-4" />
                                Return Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
