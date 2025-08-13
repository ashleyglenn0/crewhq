import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../firebase/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function SendAlert() {
  const router = useRouter();
  const { name, event } = useLocalSearchParams();

  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('error'); // default to urgent
  const audience = 'everyone';

  // Event themes (added GovTechCon theme)
  const themes = {
    RenderATL: {
      background: '#fdf0e2',
      primary: '#fe88df',
      text: '#711b43',
    },
    ATW: {
      background: '#f5f5f5',
      primary: '#ffb89e',
      text: '#4f2b91',
    },
    GovTechCon: {
      background: '#FFFFFF',
      primary: '#17A2C0',
      text: '#161F4A',
    },
  };

  // Set the theme based on the event
  const theme = themes[event] || themes.RenderATL;

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Message is required');
      return;
    }

    try {
      await addDoc(collection(db, 'alerts'), {
        message: message.trim(),
        severity,
        audience,
        event,
        createdAt: serverTimestamp(),
        sendPush: severity === 'error',
        sent: false,
        dismissedBy: [],
      });

      Alert.alert('Alert sent!');
      router.push({
        pathname: '/admin/home',
        params: { name, event },
      });
    } catch (err) {
      console.error('Error sending alert:', err);
      Alert.alert('Failed to send alert.');
    }
  };

  return (
    <ScreenWrapper scroll={false} event={event}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/admin/home', params: { name, event } })}
        style={[styles.backButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.backText, { color: theme.primary }]}>
          ← Back to Dashboard
        </Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>Send Urgent Alert</Text>

      <TextInput
        style={[styles.input, { borderColor: theme.primary, color: theme.text }]}
        placeholder="Enter your alert message"
        placeholderTextColor="#aaa"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <TouchableOpacity
        onPress={handleSend}
        style={[styles.sendButton, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.sendText}>Send Alert 🚨</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    fontSize: 16,
    height: 140,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

