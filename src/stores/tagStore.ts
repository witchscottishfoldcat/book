import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Tag {
  name: string;
  color: string;
  count: number;
}

interface TagState {
  tags: Tag[];
  selectedTags: string[];
  setTags: (tags: Tag[]) => void;
  addTag: (name: string, color?: string) => void;
  removeTag: (name: string) => void;
  updateTagCount: (tagName: string, delta: number) => void;
  selectTag: (name: string) => void;
  deselectTag: (name: string) => void;
  toggleTag: (name: string) => void;
  clearSelection: () => void;
  getTagColor: (name: string) => string;
}

const TAG_COLORS = [
  "hsl(248 75% 68%)",
  "hsl(142 65% 52%)",
  "hsl(38 95% 64%)",
  "hsl(211 100% 60%)",
  "hsl(0 72% 51%)",
  "hsl(280 65% 60%)",
  "hsl(18 90% 58%)",
  "hsl(190 90% 50%)",
];

function getColorForTag(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      tags: [],
      selectedTags: [],

      setTags: (tags) => set({ tags }),

      addTag: (name, color) => {
        const { tags } = get();
        const normalized = name.toLowerCase().trim();
        if (tags.some((t) => t.name === normalized)) return;
        set({
          tags: [
            ...tags,
            {
              name: normalized,
              color: color || getColorForTag(normalized),
              count: 1,
            },
          ],
        });
      },

      removeTag: (name) => {
        const { tags, selectedTags } = get();
        const normalized = name.toLowerCase().trim();
        set({
          tags: tags.filter((t) => t.name !== normalized),
          selectedTags: selectedTags.filter((t) => t !== normalized),
        });
      },

      updateTagCount: (tagName, delta) => {
        const { tags } = get();
        const normalized = tagName.toLowerCase().trim();
        set({
          tags: tags.map((t) =>
            t.name === normalized ? { ...t, count: Math.max(0, t.count + delta) } : t
          ),
        });
      },

      selectTag: (name) => {
        const { selectedTags } = get();
        const normalized = name.toLowerCase().trim();
        if (!selectedTags.includes(normalized)) {
          set({ selectedTags: [...selectedTags, normalized] });
        }
      },

      deselectTag: (name) => {
        const { selectedTags } = get();
        const normalized = name.toLowerCase().trim();
        set({ selectedTags: selectedTags.filter((t) => t !== normalized) });
      },

      toggleTag: (name) => {
        const { selectedTags, selectTag, deselectTag } = get();
        const normalized = name.toLowerCase().trim();
        if (selectedTags.includes(normalized)) {
          deselectTag(normalized);
        } else {
          selectTag(normalized);
        }
      },

      clearSelection: () => set({ selectedTags: [] }),

      getTagColor: (name) => {
        const { tags } = get();
        const normalized = name.toLowerCase().trim();
        const existing = tags.find((t) => t.name === normalized);
        return existing?.color || getColorForTag(normalized);
      },
    }),
    {
      name: "mdnotes-tags",
      partialize: (state) => ({ tags: state.tags }),
    }
  )
);
