import { useCallback, useEffect, useState } from 'react';
import type { EnquiryCartItem } from '@/types/publicCatalog';

function storageKey(catalogSlug: string) {
  return `qc_enquiry_cart_${catalogSlug}`;
}

function readFromStorage(catalogSlug: string): EnquiryCartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(catalogSlug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(catalogSlug: string, items: EnquiryCartItem[]) {
  try {
    localStorage.setItem(storageKey(catalogSlug), JSON.stringify(items));
  } catch {
    // Storage full/unavailable — cart just won't persist across reloads.
  }
}

// Cart state lives in localStorage, keyed per catalog, so it survives
// navigating between the catalog's list and product detail pages (two
// separate Next.js page components, each mounting this hook fresh) without
// needing a global React context.
export function useEnquiryCart(catalogSlug: string) {
  const [items, setItems] = useState<EnquiryCartItem[]>([]);

  useEffect(() => {
    if (!catalogSlug) return;
    setItems(readFromStorage(catalogSlug));
  }, [catalogSlug]);

  const persist = useCallback(
    (next: EnquiryCartItem[]) => {
      setItems(next);
      if (catalogSlug) writeToStorage(catalogSlug, next);
    },
    [catalogSlug]
  );

  const addItem = useCallback(
    (item: Omit<EnquiryCartItem, 'quantity'>, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        const next = existing
          ? prev.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i))
          : [...prev, { ...item, quantity }];
        if (catalogSlug) writeToStorage(catalogSlug, next);
        return next;
      });
    },
    [catalogSlug]
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.productId !== productId);
        if (catalogSlug) writeToStorage(catalogSlug, next);
        return next;
      });
    },
    [catalogSlug]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i));
        if (catalogSlug) writeToStorage(catalogSlug, next);
        return next;
      });
    },
    [catalogSlug]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const isInCart = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  return { items, addItem, removeItem, updateQuantity, clear, isInCart };
}
