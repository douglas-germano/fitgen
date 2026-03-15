"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                    <div className="rounded-full bg-destructive/10 p-4 mb-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={this.handleRetry} variant="default">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Tentar novamente
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                        >
                            Recarregar página
                        </Button>
                    </div>
                    {process.env.NODE_ENV === "development" && this.state.error && (
                        <details className="mt-6 text-left w-full max-w-lg">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                Detalhes do erro (desenvolvimento)
                            </summary>
                            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
                                {this.state.error.message}
                                {"\n\n"}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
