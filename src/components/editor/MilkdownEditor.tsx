import { useEditor } from "@milkdown/react";
import { Editor, defaultValueCtx, rootCtx } from "@milkdown/core";
import { parserCtx, editorViewCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { Milkdown, MilkdownProvider } from "@milkdown/react";
import { useEffect, useRef, useCallback } from "react";

interface MilkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function MilkdownEditorInner({
  value,
  onChange,
  className = "",
}: Omit<MilkdownEditorProps, "placeholder">) {
  const onChangeRef = useRef(onChange);
  const isInternalChange = useRef(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleMarkdownChange = useCallback(
    (_ctx: unknown, markdown: string, _prevMarkdown: string) => {
      isInternalChange.current = true;
      onChangeRef.current?.(markdown);
      requestAnimationFrame(() => {
        isInternalChange.current = false;
      });
    },
    []
  );

  const { get } = useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, value);
        ctx.get(listenerCtx).markdownUpdated(handleMarkdownChange);
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener);

    return editor;
  }, []);

  useEffect(() => {
    const editor = get();
    if (editor && !isInternalChange.current && isInitialized.current) {
      try {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const parser = ctx.get(parserCtx);
          const doc = parser(value);
          if (doc) {
            const state = view.state;
            const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content);
            view.dispatch(tr);
          }
        });
      } catch (error) {
        console.warn("Failed to update editor content:", error);
      }
    }
    if (editor && !isInitialized.current) {
      isInitialized.current = true;
    }
  }, [value, get]);

  return (
    <div className={`milkdown-editor-wrapper ${className}`}>
      <Milkdown />
    </div>
  );
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner {...props} />
    </MilkdownProvider>
  );
}
