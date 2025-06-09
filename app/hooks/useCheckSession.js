import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const sanitize = (str) =>
  (str || '').replace(/[^a-zA-Z0-9._-]/g, '_');

const useCheckSession = (event, name, role) => {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!event || !name || !role) return;

        const safeName = sanitize(name);
        const safeEvent = sanitize(event);

        const key = `checkedIn_${safeName}_${safeEvent}`;
        const timeKey = `checkInTime_${safeName}_${safeEvent}`;

        const isCheckedIn = await SecureStore.getItemAsync(key);
        const checkInTime = await SecureStore.getItemAsync(timeKey);

        if (!isCheckedIn || !checkInTime) return;

        const now = Date.now();
        const checkInTimestamp = Number(checkInTime);
        const elapsedMinutes = (now - checkInTimestamp) / (1000 * 60);

        const sessionLimit = 480;

        if (elapsedMinutes <= sessionLimit) {
          if (role === 'teamlead') {
            router.replace(`/teamlead/dashboard?name=${name}&event=${event}`);
          } else {
            router.replace(`/volunteer/dashboard?name=${name}&event=${event}`);
          }
        } else {
          await SecureStore.deleteItemAsync(key);
          await SecureStore.deleteItemAsync(timeKey);
        }
      } catch (err) {
        console.error('❌ Session check failed:', err);
      }
    };

    checkSession();
  }, [event, name, role]);
};

export default useCheckSession;
