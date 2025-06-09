// app/teamlead/qr.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import ScreenWrapper from '../../components/ScreenWrapper';

const themes = {
  RenderATL: {
    primary: '#fe88df',
    text: '#711b43',
  },
  ATW: {
    primary: '#ffb89e',
    text: '#4f2b91',
  },
};

export default function TeamLeadQRScreen() {
  const { name, event, floor } = useLocalSearchParams();
  const router = useRouter();
  const theme = themes[event] || themes.RenderATL;

  // ⬇️ Deep link to in-app task checkin form
  const qrValue = `/taskcheckin?teamlead=${encodeURIComponent(name)}&event=${event}&floor=${encodeURIComponent(floor || '')}`;


  return (
    <ScreenWrapper event={event}>
      <Text style={[styles.title, { color: theme.text }]}>Hello, {name}</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>Your Team Lead QR Code</Text>

      <View style={styles.qrContainer}>
        <QRCode value={qrValue} size={220} />
        <Text style={[styles.qrLabel, { color: theme.text }]}>
          Volunteers can scan this to check in to their floor assignment.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push({ pathname: '/teamlead/dashboard', params: { name, event } })}
        style={[styles.backButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.backText, { color: theme.primary }]}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrLabel: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignSelf: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
