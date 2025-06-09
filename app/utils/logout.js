import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

export async function logout() {
  await SecureStore.deleteItemAsync('volunteerSession');
  router.replace('/');
}
