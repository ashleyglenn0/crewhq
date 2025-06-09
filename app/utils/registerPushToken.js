import * as Notifications from 'expo-notifications';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Platform } from 'react-native';

export async function registerPushToken({ userId, role, event }) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Push permission not granted');
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  await setDoc(doc(db, 'push_tokens', userId), {
    token: pushToken,
    role,
    event,
    updatedAt: new Date().toISOString(),
  });

  console.log('📲 Push token registered:', pushToken);
}
