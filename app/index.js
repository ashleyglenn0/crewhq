import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const WelcomeScreen = () => {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await SecureStore.getItemAsync('volunteerSession');
        if (session) {
          const { name, event, role } = JSON.parse(session);
          if (role === 'volunteer') {
            router.replace(`/volunteer/dashboard?name=${encodeURIComponent(name)}&event=${event}`);
            return;
          } else if (role === 'teamlead') {
            router.replace(`/teamlead/dashboard?name=${encodeURIComponent(name)}&event=${event}`);
            return;
          }
        }
      } catch (err) {
        console.error("Session check failed", err);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleSelectEvent = (event) => {
    router.push({ pathname: '/role-select', params: { event } });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#711B43" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/crewhqlogo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>CrewHQ</Text>
      <Text style={styles.subtitle}>Powered by RayCodes LLC</Text>

      <Divider style={styles.divider} />
      <Text style={styles.selectText}>Select Your Event</Text>

      <View style={[styles.eventsContainer, screenWidth > 500 && styles.eventsRow]}>
        <TouchableOpacity onPress={() => handleSelectEvent('RenderATL')}>
          <Image
            source={require('../assets/images/PinkPeachIcon.png')}
            style={styles.eventLogo}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleSelectEvent('ATW')}>
          <Image
            source={require('../assets/images/ATWLogo.jpg')}
            style={styles.eventLogo}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleSelectEvent('GovTechCon')}>
          <Image
            source={require('../assets/images/GovTechConLogo.png')}
            style={styles.eventLogo}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fdf0e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fdf0e2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#711B43',
  },
  subtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
    marginTop: 4,
  },
  divider: {
    width: '80%',
    marginVertical: 30,
  },
  selectText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  eventsContainer: {
    flexDirection: 'column',
    gap: 24,
    alignItems: 'center',
  },
  eventsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  eventLogo: {
    width: 150,
    height: 80,
    resizeMode: 'contain',
  },
});

export default WelcomeScreen;
