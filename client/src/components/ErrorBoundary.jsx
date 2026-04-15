import React from 'react';

/**
 * Catches render errors so the app doesn't show a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {this.state.error?.message || 'This page could not be loaded.'}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
