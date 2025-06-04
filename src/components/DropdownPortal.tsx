import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const DropdownPortal = ({ children }: { children: ReactNode }) => {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById('dropdown-root') ?? document.body;
    setPortalEl(el);
  }, []);

  if (!portalEl) return null;
  return createPortal(children, portalEl);
}; 