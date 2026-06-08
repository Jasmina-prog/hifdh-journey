'use client';

import { useEffect, useState } from 'react';

export function PwaUpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => setShow(true);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-slate-800 px-4 py-3 text-white shadow-lg">
      <span className="text-sm">Yangi versiya mavjud!</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-4 rounded bg-white px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 active:bg-slate-200"
      >
        Yangilash
      </button>
    </div>
  );
}
