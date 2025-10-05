import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { type ChatHistoryItem } from '~/lib/persistence';
import { useFavorites } from '~/lib/hooks/useFavorites';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete?: (event: React.UIEvent) => void;
}

export function HistoryItem({ item, onDelete }: HistoryItemProps) {
  const [hovering, setHovering] = useState(false);
  const hoverRef = useRef<HTMLDivElement>(null);
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorite = isFavorite(item.id);

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;

    function mouseEnter() {
      setHovering(true);

      if (timeout) {
        clearTimeout(timeout);
      }
    }

    function mouseLeave() {
      setHovering(false);
    }

    hoverRef.current?.addEventListener('mouseenter', mouseEnter);
    hoverRef.current?.addEventListener('mouseleave', mouseLeave);

    return () => {
      hoverRef.current?.removeEventListener('mouseenter', mouseEnter);
      hoverRef.current?.removeEventListener('mouseleave', mouseLeave);
    };
  }, []);

  return (
    <div
      ref={hoverRef}
      className="group rounded-md text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 overflow-hidden flex justify-between items-center px-2 py-1"
    >
      <a href={`/chat/${item.urlId}`} className="flex w-full relative truncate block">
        {item.description}
        <div className="absolute right-0 z-1 top-0 bottom-0 bg-gradient-to-l from-bolt-elements-background-depth-2 group-hover:from-bolt-elements-background-depth-3 to-transparent w-10 flex justify-end group-hover:w-20 group-hover:from-45%">
          {hovering && (
            <div className="flex items-center gap-1 p-1">
              <button
                className={favorite ? 'i-ph:star-fill text-yellow-500' : 'i-ph:star text-bolt-elements-textSecondary hover:text-yellow-500'}
                onClick={(event) => {
                  event.preventDefault();
                  if (favorite) {
                    removeFavorite(item.id);
                  } else {
                    addFavorite(item.id, item.description || 'Chat sem título');
                  }
                }}
                title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              />
              <Dialog.Trigger asChild>
                <button
                  className="i-ph:trash scale-110 text-bolt-elements-textSecondary hover:text-bolt-elements-item-contentDanger"
                  onClick={(event) => {
                    event.preventDefault();
                    onDelete?.(event);
                  }}
                  title="Deletar conversa"
                />
              </Dialog.Trigger>
            </div>
          )}
        </div>
      </a>
    </div>
  );
}
