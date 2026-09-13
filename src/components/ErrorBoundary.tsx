import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fp-site-scroll">
          <div className="fp-auth-card">
            <h1>This view needs a fresh start.</h1>
            <p>
              Your saved project data has not been removed. Reload the page to
              try again.
            </p>
            <button
              className="fp-primary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <a href="/">Back to FrameProof</a>
          </div>
        </main>
      );
    return this.props.children;
  }
}
