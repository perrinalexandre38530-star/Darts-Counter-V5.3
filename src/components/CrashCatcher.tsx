import React from "react";

type State = { msg?: string; stack?: string };

export default class CrashCatcher extends React.Component<
  React.PropsWithChildren<{}>,
  State
> {
  state: State = {};

  componentDidCatch(error: any) {
    const msg = String(error?.message ?? error ?? "Unknown error");
    const stack = String(error?.stack ?? "");
    this.setState({ msg, stack });
    try {
      console.error("[CrashCatcher]", error);
      localStorage.setItem(
        "dc_last_crash",
        JSON.stringify({ msg, stack, at: Date.now() })
      );
    } catch {}
  }

  componentDidMount() {
    window.addEventListener("error", (e: any) => {
      const msg = String(e?.message ?? e?.error?.message ?? e ?? "window.error");
      const stack = String(e?.error?.stack ?? "");
      this.setState({ msg, stack });
      try {
        console.error("[CrashCatcher] window.error", e);
        localStorage.setItem(
          "dc_last_crash",
          JSON.stringify({ msg, stack, at: Date.now() })
        );
      } catch {}
    });

    window.addEventListener("unhandledrejection", (e: any) => {
      const msg = String(e?.reason?.message ?? e?.reason ?? "unhandledrejection");
      const stack = String(e?.reason?.stack ?? "");
      this.setState({ msg, stack });
      try {
        console.error("[CrashCatcher] unhandledrejection", e);
        localStorage.setItem(
          "dc_last_crash",
          JSON.stringify({ msg, stack, at: Date.now() })
        );
      } catch {}
    });
  }

  render() {
    if (!this.state.msg) return this.props.children;

    return (
      <div style={{ padding: 16, background: "#0b0c12", color: "#fff", minHeight: "100vh" }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>CRASH CAPTURÉ</div>
        <div style={{ opacity: 0.85, marginBottom: 10 }}>
          Prends une capture de cet écran et envoie-la moi.
        </div>

        <pre style={{
          whiteSpace: "pre-wrap",
          fontSize: 12,
          lineHeight: 1.35,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: 12,
          borderRadius: 12,
        }}>
{`MESSAGE:\n${this.state.msg}\n\nSTACK:\n${this.state.stack}`}
        </pre>
      </div>
    );
  }
}
