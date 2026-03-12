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
  onWikiLinkClick?: (target: string) => void;
  className?: string;
  placeholder?: string;
}

const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function preprocessMarkdownForWikiLinks(content: string): string {
  return content.replace(wikiLinkRegex, (_match, target, displayText) => {
    const text = displayText || target;
    return `[${text}](wiki://${encodeURIComponent(target)}){data-type="wiki-link" data-target="${target}" data-display="${text}" class="wiki-link"}`;
  });
}

function postprocessMarkdownFromWikiLinks(content: string): string {
  return content.replace(
    /\[([^\]]+)\]\(wiki:\/\/([^)]+)\)\{data-type="wiki-link" data-target="([^"]+)" data-display="([^"]+)" class="wiki-link"\}/g,
    (_match, displayText, _encodedTarget, target, _displayFromAttr) => {
      if (displayText === target) {
        return `[[${target}]]`;
      }
      return `[[${target}|${displayText}]]`;
    }
  );
}

function MilkdownEditorInner({
  value,
  onChange,
  onWikiLinkClick,
  className = "",
}: Omit<MilkdownEditorProps, "placeholder">) {
  const onChangeRef = useRef(onChange);
  const onWikiLinkClickRef = useRef(onWikiLinkClick);
  const isInternalChange = useRef(false);
  const isInitialized = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onWikiLinkClickRef.current = onWikiLinkClick;
  }, [onWikiLinkClick]);

  const handleMarkdownChange = useCallback(
    (_ctx: unknown, markdown: string, _prevMarkdown: string) => {
      isInternalChange.current = true;
      const originalMarkdown = postprocessMarkdownFromWikiLinks(markdown);
      onChangeRef.current?.(originalMarkdown);
      requestAnimationFrame(() => {
        isInternalChange.current = false;
      });
    },
    []
  );

  const { get } = useEditor((root) => {
    const preprocessedValue = preprocessMarkdownForWikiLinks(value);

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, preprocessedValue);
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
          const preprocessedValue = preprocessMarkdownForWikiLinks(value);
          const doc = parser(preprocessedValue);
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

  useEffect(() => {
    if (!onWikiLinkClick || !wrapperRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkEl = target.closest('[data-type="wiki-link"]') as HTMLElement | null;

      if (linkEl) {
        const linkTarget = linkEl.getAttribute("data-target");
        if (linkTarget) {
          e.preventDefault();
          e.stopPropagation();
          onWikiLinkClickRef.current?.(linkTarget);
        }
      }
    };

    const wrapper = wrapperRef.current;
    wrapper.addEventListener("click", handleClick, true);
    return () => {
      wrapper.removeEventListener("click", handleClick, true);
    };
  }, [onWikiLinkClick]);

  return (
    <div ref={wrapperRef} className={`milkdown-editor-wrapper ${className}`}>
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
