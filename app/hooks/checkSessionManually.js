import * as SecureStore from 'expo-secure-store';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

// Utility to sanitize SecureStore keys
const makeSecureKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

export const checkSessionManually = async (event, name, role, router) => {
  try {
    const key = makeSecureKey(`checkedIn_${name}_${event}`);
    const timeKey = makeSecureKey(`checkInTime_${name}_${event}`);

    const isCheckedIn = await SecureStore.getItemAsync(key);
    const checkInTime = await SecureStore.getItemAsync(timeKey);

    if (!isCheckedIn || !checkInTime) return false;

    const now = Date.now();
    const checkInTimestamp = Number(checkInTime);
    const elapsedMinutes = (now - checkInTimestamp) / (1000 * 60);

    const sessionLimit = 450; // 7.5 hours

    if (elapsedMinutes <= sessionLimit) {
      const path =
        role === 'teamlead' ? 'teamlead/dashboard' : 'volunteer/dashboard';
      router.replace(`/${path}?name=${name}&event=${event}`);
      return true;
    } else {
      // ❌ Session expired — clean up
      await SecureStore.deleteItemAsync(key);
      await SecureStore.deleteItemAsync(timeKey);

      // ✅ Optional: mark Firestore as auto checked out
      const [firstName, lastName] = name.split(' ');
      const checkInsRef = collection(db, 'check_ins');

      const matchQuery = query(
        checkInsRef,
        where('first_name', '==', firstName),
        where('last_name', '==', lastName),
        where('event', '==', event),
        where('status', '==', 'Checked In')
      );

      const snap = await getDocs(matchQuery);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          status: 'Auto Checked Out',
          autoCheckedOutAt: new Date(),
        });
      }

      return false;
    }
  } catch (err) {
    console.error('❌ Session check failed:', err);
    return false;
  }
};
