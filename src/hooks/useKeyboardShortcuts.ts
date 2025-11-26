import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        // Exception: Allow '/' to focus search even from inputs if it's the first character
        if (
          event.key === "/" &&
          target.tagName === "INPUT" &&
          (target as HTMLInputElement).value === ""
        ) {
          // Let it fall through
        } else {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches =
          shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatches =
          shortcut.shiftKey === undefined ||
          event.shiftKey === shortcut.shiftKey;
        const altMatches =
          shortcut.altKey === undefined || event.altKey === shortcut.altKey;
        const metaMatches =
          shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

        if (
          keyMatches &&
          ctrlMatches &&
          shiftMatches &&
          altMatches &&
          metaMatches
        ) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

// Helper to show keyboard shortcuts to user
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const keys: string[] = [];

  if (shortcut.ctrlKey) keys.push("Ctrl");
  if (shortcut.altKey) keys.push("Alt");
  if (shortcut.shiftKey) keys.push("Shift");
  if (shortcut.metaKey) keys.push("⌘");

  keys.push(shortcut.key.toUpperCase());

  return keys.join("+");
}
