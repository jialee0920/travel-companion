'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mukho-location-consent-v2';

export function useLocationConsent() {
  const [consented, setConsented] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setConsented(true);
    else if (stored === 'false') setConsented(false);
    else setConsented(null);
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
