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

export default function AssignmentsTab() {
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

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
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Shift Assignments</Text>

      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.dateButtonText}>📅 {dateStr}</Text>
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
        <Text style={styles.emptyText}>No shifts scheduled for this date.</Text>
      )}

      {shifts.map((shift) => (
        <View key={shift.id} style={styles.shiftCard}>
          <Text style={styles.shiftTitle}>
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
                      style={styles.assignButton}
                    >
                      <Text style={styles.assignText}>Assign Team Lead</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No volunteers yet.</Text>
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
    backgroundColor: "#fe88df",
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
    backgroundColor: "#fe88df",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assignText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  emptyText: {
    fontStyle: "italic",
    color: "#777",
    marginTop: 10,
  },
});
