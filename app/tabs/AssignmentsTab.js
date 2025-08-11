import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { format } from "date-fns";
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
    text: "#161F4A",
  },
};

export default function AssignmentsTab() {
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;

  const fetchShifts = async (dateStr) => {
    const q = query(collection(db, "shifts"), where("date", "==", dateStr));
    const snapshot = await getDocs(q);

    const shiftData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setShifts(shiftData);
  };

  useEffect(() => {
    fetchShifts(format(selectedDate, "yyyy-MM-dd"));
  }, [selectedDate]);

  const assignTeamLead = async (shiftId, volunteer) => {
    try {
      await updateDoc(doc(db, "shifts", shiftId), {
        team_lead_uid: volunteer.uid,
      });

      const q = query(
        collection(db, "scheduled_volunteers"),
        where("uid", "==", volunteer.uid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { role: "teamlead" });
      }

      Alert.alert("Success", `${volunteer.first_name} assigned as Team Lead.`);
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId ? { ...s, team_lead_uid: volunteer.uid } : s
        )
      );
    } catch (error) {
      console.error("Error assigning team lead:", error);
      Alert.alert("Error", "Could not assign team lead.");
    }
  };

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Shift Assignments</Text>

      <TouchableOpacity
        style={[styles.dateButton, { backgroundColor: theme.primary }]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.dateButtonText, { color: theme.text }]}>📅 {dateStr}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {shifts.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.text }]}>No shifts scheduled for this date.</Text>
      )}
      {shifts.map((shift) => (
  <View key={shift.id} style={styles.shiftCard}>
    <Text style={[styles.shiftTitle, { color: theme.text }]}>
      {shift.date} | {shift.start_time}–{shift.end_time} ({shift.floor})
    </Text>

    {shift.claimed_by?.length > 0 ? (
      shift.claimed_by.map((volunteer) => {
        const isLead = shift.team_lead_uid === volunteer.uid;

        return (
          <View key={volunteer.uid} style={styles.volunteerRow}>
            <Text style={[styles.volunteerName, isLead && styles.teamLead]}>
              {volunteer.first_name} {volunteer.last_name}
              {isLead ? " (Team Lead)" : ""}
            </Text>

            {!isLead && (
              <TouchableOpacity
                onPress={() => assignTeamLead(shift.id, volunteer)}
                style={[styles.assignButton, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.assignText, { color: theme.text }]}>
                  Assign Team Lead
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })
    ) : (
      <Text style={[styles.emptyText, { color: theme.text }]}>No volunteers yet.</Text>
    )}
  </View>
))}


      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  dateButton: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  shiftCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  volunteerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  volunteerName: {
    fontSize: 14,
  },
  teamLead: {
    fontWeight: "bold",
    color: "#711B44",
  },
  assignButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assignText: {
    fontWeight: "600",
    fontSize: 12,
  },
  emptyText: {
    fontStyle: "italic",
    color: "#777",
    marginTop: 10,
  },
});
