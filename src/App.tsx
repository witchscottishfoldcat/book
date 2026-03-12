import { useState, useEffect } from "react";
import { Sidebar } from "./components/sidebar/Sidebar";
import { Editor } from "./components/editor/Editor";
import { useWorkspaceStore } from "./stores/workspaceStore";

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        {/* Logo mark */}
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(248 82% 68% / 0.9), hsl(270 75% 65% / 0.9))",
              boxShadow: "0 8px 32px hsl(248 82% 68% / 0.3)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div
            className="absolute inset-0 rounded-2xl opacity-40 blur-xl"
            style={{ background: "linear-gradient(135deg, hsl(248 82% 68%), hsl(270 75% 65%))" }}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            MDNotes
          </span>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "hsl(var(--primary))" }}
            />
            正在加载工作区...
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { initWorkspace } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initWorkspace();
      setIsLoading(false);
    };
    init();
  }, [initWorkspace]);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Editor />
      </main>
    </div>
  );
}

export default App;
