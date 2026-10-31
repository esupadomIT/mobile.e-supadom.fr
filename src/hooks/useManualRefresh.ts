import { useRef, useState } from 'react';

/** Seul le geste utilisateur déclenche le spinner ; le polling reste silencieux. */
export function useManualRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef(false);

  const onRefresh = async () => {
    if (active.current) return;
    active.current = true;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      active.current = false;
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
}
