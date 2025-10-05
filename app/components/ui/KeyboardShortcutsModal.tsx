import { useEffect, useState } from 'react';
import { Dialog, DialogRoot, DialogTitle } from './Dialog';
import { classNames } from '~/utils/classNames';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    keys: ['Ctrl', 'J'],
    description: 'Alternar Terminal',
    category: 'Editor',
  },
  {
    keys: ['Shift', 'Enter'],
    description: 'Nova linha no prompt',
    category: 'Chat',
  },
  {
    keys: ['Enter'],
    description: 'Enviar mensagem',
    category: 'Chat',
  },
  {
    keys: ['Ctrl', 'S'],
    description: 'Salvar arquivo atual',
    category: 'Editor',
  },
  {
    keys: ['Ctrl', 'K'],
    description: 'Abrir pesquisa de arquivos',
    category: 'Navegação',
  },
  {
    keys: ['Ctrl', 'B'],
    description: 'Alternar barra lateral',
    category: 'Interface',
  },
  {
    keys: ['Ctrl', '/'],
    description: 'Comentar/Descomentar linha',
    category: 'Editor',
  },
  {
    keys: ['?'],
    description: 'Mostrar atalhos (esta janela)',
    category: 'Ajuda',
  },
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        setIsOpen(true);
      }

      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

  return (
    <DialogRoot open={isOpen}>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onBackdrop={() => setIsOpen(false)}
      >
        <DialogTitle>Atalhos de Teclado</DialogTitle>
        <div className="px-5 pb-5 max-h-[70vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-bolt-elements-textSecondary mb-3 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter((s) => s.category === category).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-bolt-elements-borderColor last:border-0"
                  >
                    <span className="text-bolt-elements-textPrimary">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className={classNames(
                            'px-2 py-1 text-xs font-mono rounded',
                            'bg-bolt-elements-code-background text-bolt-elements-code-text',
                            'border border-bolt-elements-borderColor',
                            'shadow-sm'
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 pt-2 border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
          <p className="text-xs text-bolt-elements-textTertiary text-center">
            Pressione <kbd className="kdb">?</kbd> a qualquer momento para ver esta janela
          </p>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
