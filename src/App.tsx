import { useState, useEffect } from "react";
import { Sidebar } from "./components/sidebar/Sidebar";
import { Editor } from "./components/editor/Editor";
import { useWorkspaceStore } from "./stores/workspaceStore";

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

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
