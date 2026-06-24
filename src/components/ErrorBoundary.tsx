import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Global error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 text-stone-900 p-6">
          <h1 className="text-2xl font-kinder mb-4">Une erreur est survenue</h1>
          <p className="mb-6 text-stone-600 text-center max-w-sm">
            L'application a rencontré un problème inattendu. Veuillez rafraîchir la page ou réessayer plus tard.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-stone-800 transition-colors"
          >
            Rafraîchir
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
