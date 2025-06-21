import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
} from "firebase/firestore";
import Checkbox from "expo-checkbox";
import { format, eachDayOfInterval, parseISO } from "date-fns";

const SHIFTS = [
  "7am - 1pm",
  "1pm - 7pm",
  "4pm - 9pm (Render)",
  "9pm - 12am (Render)",
];

export default function AvailabilityForm({ event, name, uid }) {
  const [availability, setAvailability] = useState({});
  const [dateRange, setDateRange] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState([]);

  useEffect(() => {
    const fetchEventDates = async () => {
        const q = query(collection(db, "events"), where("name", "==", event));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const eventData = snapshot.docs[0].data();
          const { start_date, end_date } = eventData;
          const days = eachDayOfInterval({
            start: parseISO(start_date),
            end: parseISO(end_date),
          });
          setDateRange(days);
        }


      if (eventDoc.exists()) {
        const { start_date, end_date } = eventDoc.data();
        const days = eachDayOfInterval({
            start: new Date(`${start_date}T00:00:00`),
            end: new Date(`${end_date}T00:00:00`),
          });
        setDateRange(days);
      }

    };

    fetchEventDates();
  }, [event]);

  const toggleAvailability = (day, shift) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [shift]: !prev[day]?.[shift],
      },
    }));
  };

  const handleSubmit = async () => {
    const payload = [];
    for (const [day, shifts] of Object.entries(availability)) {
      for (const [shift, isAvailable] of Object.entries(shifts)) {
        if (isAvailable) {
          payload.push({ day, shift });
        }
      }
    }

    try {
      const availabilityRef = collection(db, "availability");
      for (const entry of payload) {
        await addDoc(availabilityRef, {
          event,
          uid,
          name,
          ...entry,
          timestamp: new Date().toISOString(),
        });
      }

      setSubmittedData(payload);
      setSubmitted(true);
      Alert.alert("Success", "Availability submitted.");
    } catch (err) {
      console.error("Error submitting availability:", err);
      Alert.alert("Error submitting availability.");
    }
  };

  if (submitted) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Thanks for submitting your availability!</Text>
        <Text style={styles.subtext}>Check back later to see your assigned schedule.</Text>

        {submittedData.map((entry, index) => (
          <View key={index} style={styles.summaryRow}>
            <Text>{entry.day}</Text>
            <Text style={styles.summaryShift}>{entry.shift}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => Alert.alert("Info", "Use the back button to return to dashboard.")}
        >
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Select Your Availability</Text>
      <Text style={styles.subtext}>Please select only the times you're available. You will be scheduled based on this info.</Text>
      {dateRange.map((day) => {
        const dayLabel = format(day, "yyyy-MM-dd");
        return (
          <View key={dayLabel} style={styles.daySection}>
            <Text style={styles.dayLabel}>{dayLabel}</Text>
            {SHIFTS.map((shift) => (
              <View key={shift} style={styles.shiftRow}>
                <Checkbox
                  value={availability?.[dayLabel]?.[shift] || false}
                  onValueChange={() => toggleAvailability(dayLabel, shift)}
                />
                <Text style={styles.shiftLabel}>{shift}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
        <Text style={styles.submitText}>Submit Availability</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  daySection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingBottom: 10,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftLabel: {
    marginLeft: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#fe88df",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: {
    color: "white",
    fontWeight: "600",
  },
});
