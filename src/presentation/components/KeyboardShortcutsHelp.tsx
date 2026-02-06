import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  section: string;
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { keys: ['↑', 'k'], description: 'Move up in list', section: 'Navigation' },
  { keys: ['↓', 'j'], description: 'Move down in list', section: 'Navigation' },
  { keys: ['Home', 'g'], description: 'Go to first item', section: 'Navigation' },
  { keys: ['End', 'G'], description: 'Go to last item', section: 'Navigation' },
  { keys: ['Enter', 'Space'], description: 'Open selected item', section: 'Navigation' },
  
  // Actions
  { keys: ['Ctrl', 'N'], description: 'New task', section: 'Actions' },
  { keys: ['Ctrl', 'R'], description: 'Refresh list', section: 'Actions' },
  { keys: ['Esc'], description: 'Close dialog', section: 'Actions' },
  { keys: ['?'], description: 'Show keyboard shortcuts', section: 'Actions' },
];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for ? key to toggle help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform z-40"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }

  const sections = Array.from(new Set(SHORTCUTS.map(s => s.section)));

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto z-50 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close shortcuts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {sections.map(section => (
            <div key={section}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                {section}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.section === section).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </>
  );
}
