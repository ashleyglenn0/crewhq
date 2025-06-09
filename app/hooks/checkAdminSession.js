import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// ✅ sanitize key to prevent SecureStore crash
const makeSecureKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

const useCheckAdminSession = (event) => {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!event) return;

        const loggedInKey = makeSecureKey(`adminLoggedIn_${event}`);
        const loginTimeKey = makeSecureKey(`adminLoginTime_${event}`);
        const nameKey = makeSecureKey(`adminName_${event}`);

        const isLoggedIn = await SecureStore.getItemAsync(loggedInKey);
        const loginTime = await SecureStore.getItemAsync(loginTimeKey);
        const name = await SecureStore.getItemAsync(nameKey);

        if (!isLoggedIn || !loginTime || !name) return;

        const now = Date.now();
        const loginTimestamp = Number(loginTime);
        const daysElapsed = (now - loginTimestamp) / (1000 * 60 * 60 * 24);

        if (daysElapsed <= 5) {
          router.replace(`/admin/home?name=${name}&event=${event}`);
        } else {
          await SecureStore.deleteItemAsync(loggedInKey);
          await SecureStore.deleteItemAsync(loginTimeKey);
          await SecureStore.deleteItemAsync(nameKey);
        }
      } catch (err) {
        console.error('❌ Failed to check admin session:', err);
      }
    };

    checkSession();
  }, [event]);
};

export default useCheckAdminSession;
