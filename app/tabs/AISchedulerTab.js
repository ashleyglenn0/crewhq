import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert, ScrollView, TextInput, StyleSheet } from "react-native";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import moment from "moment";
import { useLocalSearchParams } from "expo-router";

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

export default function AISchedulerTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState([]);
  const [shifts, setShifts] = useState([]); // To hold the list of created shifts
  const [startDate, setStartDate] = useState(""); // New state for start date
  const [endDate, setEndDate] = useState(""); // New state for end date
  const [timeRange, setTimeRange] = useState(""); // New state for time range
  const [volunteersNeeded, setVolunteersNeeded] = useState(""); // New state for volunteers needed
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;

  const runScheduler = async () => {
    setLoading(true);

    if (!startDate || !endDate || !timeRange || !volunteersNeeded) {
      Alert.alert("Error", "Please fill in all the fields!");
      setLoading(false);
      return;
    }

    try {
      // 1. Get shifts based on the date range and time range specified
      const shiftsQuery = query(
        collection(db, "shifts"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        where("time", "==", timeRange)
      );
      const shiftsSnapshot = await getDocs(shiftsQuery);
      const fetchedShifts = shiftsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // 2. Get volunteers who are available within the time range
      const availabilityQuery = query(
        collection(db, "availability"),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const availabilitySnapshot = await getDocs(availabilityQuery);

      const volunteerAvailability = {};
      availabilitySnapshot.forEach((doc) => {
        const data = doc.data();
        volunteerAvailability[data.volunteerId] = data;
      });

      // 3. Get already scheduled volunteers
      const scheduledVolunteerIds = new Set();
      fetchedShifts.forEach(shift => {
        if (shift.claimed_by) {
          shift.claimed_by.forEach(vol => scheduledVolunteerIds.add(vol.uid));
        }
      });

      // 4. Assign logic
      const updatedShifts = [];
      for (const shift of fetchedShifts) {
        const eligibleVolunteers = Object.values(volunteerAvailability).filter((vol) => {
          return (
            !scheduledVolunteerIds.has(vol.volunteerId) &&
            vol.available_times.includes(shift.time)
          );
        });

        // Sort by fewest existing shifts
        eligibleVolunteers.sort((a, b) => (a.shiftsCount || 0) - (b.shiftsCount || 0));

        const numNeeded = volunteersNeeded; // Use the user-input number of volunteers
        const assigned = eligibleVolunteers.slice(0, numNeeded);

        const assignments = assigned.map((vol) => ({
          uid: vol.volunteerId,
          first_name: vol.first_name,
          last_name: vol.last_name,
          role: "volunteer",
        }));

        // Firestore update
        await updateDoc(doc(db, "shifts", shift.id), {
          claimed_by: [...(shift.claimed_by || []), ...assignments],
        });

        updatedShifts.push({
          shift: shift.time,
          assigned: assignments.length,
          needed: numNeeded,
        });

        // Alert if less than 50% filled (not including overage)
        if (assignments.length < Math.floor(numNeeded * 0.5)) {
          Alert.alert(
            "Warning",
            `Less than 50% of volunteers were assigned for shift at ${shift.time}`
          );
        }
      }

      setShifts(fetchedShifts); // Set the created shifts to show in the list
      setResult(updatedShifts); // Display assignments and availability
    } catch (err) {
      console.error("Scheduler error:", err);
      Alert.alert("Error", "Something went wrong while scheduling shifts.");
    }

    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: theme.background }}>
      <Text style={[{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }, { color: theme.text }]}>
        Automatically Schedule Shifts
      </Text>

      {/* Add inputs for start date, end date, time range, and volunteers needed */}
      <TextInput
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        style={[{ marginBottom: 10, padding: 8, borderWidth: 1, borderRadius: 5 }, { borderColor: theme.primary, color: theme.text }]}
      />
      <TextInput
        placeholder="End Date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        style={[{ marginBottom: 10, padding: 8, borderWidth: 1, borderRadius: 5 }, { borderColor: theme.primary, color: theme.text }]}
      />
      <TextInput
        placeholder="Time Range (e.g., 9:00 AM - 5:00 PM)"
        value={timeRange}
        onChangeText={setTimeRange}
        style={[{ marginBottom: 10, padding: 8, borderWidth: 1, borderRadius: 5 }, { borderColor: theme.primary, color: theme.text }]}
      />
      <TextInput
        placeholder="Number of Volunteers Needed"
        value={volunteersNeeded}
        onChangeText={setVolunteersNeeded}
        keyboardType="numeric"
        style={[{ marginBottom: 20, padding: 8, borderWidth: 1, borderRadius: 5 }, { borderColor: theme.primary, color: theme.text }]}
      />

      <Button title="Run AI Scheduler" onPress={runScheduler} disabled={loading} color={theme.primary} />
      {loading && <Text style={{ color: theme.text }}>Running scheduler...</Text>}

      {/* Show created shifts */}
      <Text style={[{ fontSize: 18, fontWeight: "bold", marginTop: 20 }, { color: theme.text }]}>
        Created Shifts for {startDate} to {endDate}
      </Text>
      {shifts.map((shift, idx) => (
        <View key={idx} style={{ marginVertical: 10 }}>
          <Text style={{ color: theme.text }}>Shift: {shift.time}</Text>
          <Text style={{ color: theme.text }}>Role: {shift.role}</Text>
          <Text style={{ color: theme.text }}>Floor: {shift.floor}</Text>
          <Text style={{ color: theme.text }}>Volunteers Needed: {shift.number_of_volunteers}</Text>
        </View>
      ))}

      {/* Show the number of volunteers assigned to each shift */}
      <Text style={[{ fontSize: 18, fontWeight: "bold", marginTop: 20 }, { color: theme.text }]}>
        Shift Assignment Status
      </Text>
      {!loading &&
        result.map((res, idx) => (
          <Text key={idx} style={{ color: theme.text }}>
            {res.assigned} volunteers assigned to shift at {res.shift} (needed {res.needed})
          </Text>
        ))}
    </ScrollView>
  );
}
