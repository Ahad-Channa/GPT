import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DailyBonusContext = createContext(null);
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function DailyBonusProvider({ children }) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStatus(data);
    } catch (err) {
      console.error('[DailyBonus] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) fetchStatus();
  }, [currentUser, fetchStatus]);

  return (
    <DailyBonusContext.Provider value={{ status, loading, fetchStatus }}>
      {children}
    </DailyBonusContext.Provider>
  );
}

export function useDailyBonus() {
  return useContext(DailyBonusContext);
}
