import { useEffect } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const matchesMeta = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const matchesShift =
          shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const matchesAlt = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

        if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Platform detection
export const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Helper to create cross-platform shortcuts
export function createShortcut(
  key: string,
  callback: () => void,
  options: Partial<Omit<KeyboardShortcut, 'key' | 'callback'>> = {}
): KeyboardShortcut {
  return {
    key,
    callback,
    ...options,
  };
}

// Common shortcuts with platform detection
export function createNewItemShortcut(callback: () => void): KeyboardShortcut {
  return isMac
    ? { key: 'n', metaKey: true, callback }
    : { key: 'n', ctrlKey: true, callback };
}

export function createSaveShortcut(callback: () => void): KeyboardShortcut {
  return isMac
    ? { key: 's', metaKey: true, callback }
    : { key: 's', ctrlKey: true, callback };
}

export function createSearchShortcut(callback: () => void): KeyboardShortcut {
  return isMac
    ? { key: 'k', metaKey: true, callback }
    : { key: 'k', ctrlKey: true, callback };
}
