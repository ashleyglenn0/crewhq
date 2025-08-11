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
import { db } from '../firebase/firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';

// Event themes
const themes = {
  RenderATL: {
    background: "#fdf0e2",
    primary: "#fe88df",
    text: "#711b43",
  },
  ATW: {
    background: "#f5f5f5",
    primary: "#ffb89e",
    text: "#4f2b91",
  },
  GovTechCon: {
    background: "FFFFFF",
    primary: "#17A2C0",
    text: "#161F4A"
  }
};

// Static map for event logos
const eventLogos = {
  RenderATL: require('../assets/images/PinkPeachIcon.png'),
  ATW: require('../assets/images/ATWLogo.jpg'),
  GovTechCon: require('../assets/images/GovTechConLogo.png')
};

const WelcomeScreen = () => {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [activeEvents, setActiveEvents] = useState([]);

  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        const eventsQuery = query(collection(db, "events"));
        const snapshot = await getDocs(eventsQuery);
        const events = snapshot.docs.map((doc) => doc.data());
  
        const today = new Date();
        
        // Set the number of days before the event to show it as active
        const daysBeforeEvent = 45; // Show event 45 days before it starts
  
        const activeEventList = events.filter(event => {
          const startDate = new Date(event.start_date); // Parse start_date into Date
          const endDate = new Date(event.end_date); // Parse end_date into Date
          const daysBeforeStart = new Date(startDate);
          daysBeforeStart.setDate(startDate.getDate() - daysBeforeEvent); // Calculate the adjusted start date
  
          // Event is active if today is within the range of days before the event or during the event
          return today >= daysBeforeStart && today <= endDate;
        });
  
        setActiveEvents(activeEventList); // Set the filtered active events
      } catch (error) {
        console.error("Error fetching events:", error);
      }
      setLoading(false);
    };
  
    fetchActiveEvents();
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
        {activeEvents.map((event) => (
          <TouchableOpacity key={event.name} onPress={() => handleSelectEvent(event.name)}>
            <Image
              source={eventLogos[event.name]}  // Use the static reference from eventLogos
              style={styles.eventLogo}
            />
          </TouchableOpacity>
        ))}
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
