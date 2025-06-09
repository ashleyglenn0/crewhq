import React, { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';

export default function AppEntry() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await SecureStore.getItemAsync('volunteerSession');
        if (session) {
          const { name, event, role } = JSON.parse(session);
          if (role === 'volunteer') {
            router.replace(`/volunteer/dashboard?name=${encodeURIComponent(name)}&event=${event}`);
            return;
          }
          if (role === 'teamlead') {
            router.replace(`/teamlead/dashboard?name=${encodeURIComponent(name)}&event=${event}`);
            return;
          }
        }
      } catch (err) {
        console.error("Session error:", err);
      }
      setIsReady(true);
    };

    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf0e2' }}>
        <ActivityIndicator size="large" color="#711B43" />
      </View>
    );
  }

  return <Slot />;
}
