import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

// 👇 Define or import this from a shared theme file if you prefer
const themes = {
  RenderATL: {
    background: "#FDF0E2",
    primary: "#FE88DF",
    text: "#711B43",
  },
  ATLTechWeek: {
    background: "#E6FFFA",
    primary: "#1C6E8C",
    text: "#1E1E1E",
  },
  GovTechCon: {
    background: "#FFFFFF",
    primary: "#17A2C0",
    text: "#161F4A",
  }
};

export default function RequestChangeForm() {
  const { event, uid } = useLocalSearchParams();
  const router = useRouter();

  const [myShifts, setMyShifts] = useState([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);
  const [reason, setReason] = useState("");

  const theme = themes[event] || themes.RenderATL;

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const q = collection(db, "shifts");
        const snapshot = await getDocs(q);
        const shifts = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((shift) => shift.event === event && shift.claimed_by?.some((v) => v.uid === uid));
        setMyShifts(shifts);
      } catch (error) {
        console.error("Error fetching shifts:", error);
      }
    };

    fetchShifts();
  }, [event, uid]);

  const toggleShiftSelection = (id) => {
    setSelectedShiftIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedShiftIds.length === 0) {
      Alert.alert("Please select at least one shift to drop.");
      return;
    }

    try {
      await addDoc(collection(db, "schedule_change_requests"), {
        uid,
        event,
        shifts_to_drop: selectedShiftIds,
        reason,
        timestamp: new Date().toISOString(),
        status: "pending",
      });
      Alert.alert("Request submitted successfully!");
      router.back();
    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert("There was an issue submitting your request.");
    }
  };
  console.log(event)
  console.log("ResolvedTheme", theme)

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.header, { color: theme.text }]}>Select Shifts to Drop</Text>
      {myShifts.map((shift) => (
        <TouchableOpacity
          key={shift.id}
          style={[
            styles.card,
            selectedShiftIds.includes(shift.id) && { borderColor: theme.primary },
          ]}
          onPress={() => toggleShiftSelection(shift.id)}
        >
          <Text style={[styles.shiftText, { color: theme.text }]}>
            {shift.date} | {shift.start_time}–{shift.end_time}
          </Text>
          <Text style={{ color: theme.text }}>{shift.role} – {shift.floor}</Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.header, { color: theme.text }]}>Optional Reason</Text>
      <TextInput
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        placeholder="Let us know why you're requesting this change (optional)"
        multiline
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.primary }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Submit Change Request</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontWeight: "600",
    fontSize: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  shiftText: {
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#000",
  },
  submitButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
