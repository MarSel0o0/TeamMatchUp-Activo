import { useEffect } from 'react';

const BASE_TITLE = 'TeamMatchUp';

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
  }, [title]);
}
