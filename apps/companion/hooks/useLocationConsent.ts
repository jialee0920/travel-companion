'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mukho-location-consent';

export function useLocationConsent() {
  const [consented, setConsented] = useState<boolean | null>(null);

  useEffect(() => {
    setConsented(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setConsented(true);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    setConsented(false);
  };

  return { consented, accept, decline, ready: consented !== null };
}
