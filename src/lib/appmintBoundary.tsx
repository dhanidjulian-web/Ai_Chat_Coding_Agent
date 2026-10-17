// Remint diagnostic boundary — injected at build time. Never edit or import manually.
import React from "react";

type BState = { error: Error | null; stack: string };

export default class AppmintBoundary extends React.Component<React.PropsWithChildren, BState> {
  state: BState = { error: null, stack: "" };

  static getDerivedStateFromError(error: Error): Partial<BState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const stack = (info && info.componentStack) || "";
    this.setState({ stack });
    try {
      // Boundary-caught errors never reach window 'error' on their own. Re-dispatch so the
      // smoke harness AND field telemetry (both window-'error' listeners) see the real
      // failure with its component stack.
      const msg =
        "React render error: " + ((error && error.message) || String(error)) +
        (stack ? "\nComponent stack:" + stack.slice(0, 600) : "");
      window.dispatchEvent(new ErrorEvent("error", { error: new Error(msg), message: msg }));
    } catch (_) { /* reporting must never mask the original failure */ }
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return React.createElement(
        "div",
        { style: { padding: "24px", fontFamily: "ui-monospace, monospace", color: "#7f1d1d", background: "#fef2f2", minHeight: "100vh", boxSizing: "border-box" } },
        React.createElement("div", { style: { fontWeight: 700, marginBottom: "8px", fontSize: "15px" } }, "This screen crashed"),
        React.createElement("div", { style: { whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.5 } }, (e && e.message) || String(e)),
        this.state.stack
          ? React.createElement("pre", { style: { whiteSpace: "pre-wrap", fontSize: "11px", opacity: 0.75, marginTop: "12px" } }, this.state.stack.slice(0, 800))
          : null
      );
    }
    return this.props.children;
  }
}
