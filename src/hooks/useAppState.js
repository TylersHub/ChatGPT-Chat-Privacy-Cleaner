import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useAppState() {
  const [state, setState] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setState(await api('/state'));
    } catch (error) {
      setRequestError(error.message);
    }
  }, []);

  const act = useCallback(async (path, body = {}) => {
    setRequestError(null);
    try {
      const result = await api(path, body);
      await refresh();
      return result;
    } catch (error) {
      setRequestError(error.message);
      throw error;
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, state?.job ? 500 : 1200);
    return () => window.clearInterval(timer);
  }, [refresh, state?.job]);

  return { state, requestError, setRequestError, refresh, act };
}

