import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import moment from "moment";

// Themes for different events
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

const TodayScheduleTab = ({ event }) => {
  const [scheduledVolunteers, setScheduledVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayDate = moment().format("YYYY-MM-DD");

  // Set theme based on event
  const theme = themes[event] || themes.RenderATL;

  useEffect(() => {
    const fetchTodayVolunteers = async () => {
      try {
        const shiftsRef = collection(db, "shifts");
        const todayQuery = query(
          shiftsRef,
          where("event", "==", event),
          where("date", "==", todayDate)
        );

        const snapshot = await getDocs(todayQuery);
        const todayVolunteers = snapshot.docs.map((doc) => {
          const shiftData = doc.data();
          
          // Get the first and last name from the claimed_by array
          const volunteer = shiftData.claimed_by[0]; // Assuming only 1 volunteer per shift

          return {
            name: `${volunteer.first_name} ${volunteer.last_name}`,
            role: shiftData.role,
            task: shiftData.role || "TBD", // Treat role as task
            startTime: shiftData.start_time,
            endTime: shiftData.end_time,
            floor: shiftData.floor, // Floor info
          };
        });

        setScheduledVolunteers(todayVolunteers);
      } catch (err) {
        console.error("Error fetching today's volunteers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayVolunteers();
  }, [event]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Today’s Schedule</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.text} />
      ) : scheduledVolunteers.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          There are currently no volunteers scheduled.{"\n"}View the “Create a
          Shift” tab or the AI Scheduler to schedule volunteers for today.
        </Text>
      ) : (
        scheduledVolunteers.map((shift, index) => (
          <View key={index} style={[styles.card, { borderColor: theme.primary }]}>
            <Text style={[styles.name, { color: theme.text }]}>{shift.name}</Text>
            <Text style={[styles.detail, { color: theme.text }]}>
              Time: {shift.startTime} – {shift.endTime}
            </Text>
            <Text style={[styles.detail, { color: theme.text }]}>
              Role: {shift.task}
            </Text>
            <Text style={[styles.detail, { color: theme.text }]}>
              Floor: {shift.floor}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  detail: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 32,
    lineHeight: 24,
  },
});

export default TodayScheduleTab;
