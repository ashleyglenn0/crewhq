import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDoc, collection, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

export default function CreateShiftTab({ event }) {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [floor, setFloor] = useState("");
  const [role, setRole] = useState("");
  const [volunteersNeeded, setVolunteersNeeded] = useState("");
  const [overageBuffer, setOverageBuffer] = useState("");
  const [teamLeadsNeeded, setTeamLeadsNeeded] = useState("");
  const [notes, setNotes] = useState("");
  const [manualScheduling, setManualScheduling] = useState(true);

  useEffect(() => {
    const fetchSchedulingMode = async () => {
      const eventDoc = await getDoc(doc(db, "events", event));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setManualScheduling(data.manual_scheduling ?? true);
      }
    };

    fetchSchedulingMode();
  }, [event]);

  const toggleSchedulingMode = async () => {
    const newMode = !manualScheduling;
    try {
      await setDoc(
        doc(db, "events", event),
        { manual_scheduling: newMode },
        { merge: true }
      );
      setManualScheduling(newMode);
    } catch (err) {
      console.error("Error updating scheduling mode:", err);
    }
  };

  const handleSubmit = async () => {
    const maxSignups =
      parseInt(volunteersNeeded || "0") + parseInt(overageBuffer || "0");

    try {
      await addDoc(collection(db, "shifts"), {
        event,
        date: date.toLocaleDateString("en-CA"),
        start_time: startTime,
        end_time: endTime,
        floor,
        role,
        volunteers_needed: parseInt(volunteersNeeded || "0"),
        overage_buffer: parseInt(overageBuffer || "0"),
        max_signups: maxSignups,
        team_leads_needed: parseInt(teamLeadsNeeded || "0"),
        notes,
        claimed_by: [],
      });

      alert("Shift created!");

      setStartTime("");
      setEndTime("");
      setFloor("");
      setRole("");
      setVolunteersNeeded("");
      setOverageBuffer("");
      setTeamLeadsNeeded("");
      setNotes("");
      setDate(new Date());
    } catch (err) {
      console.error("Error creating shift:", err);
      alert("Failed to create shift.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create New Shift</Text>

      <View style={styles.toggleRow}>
        <Text style={styles.label}>Manual Scheduling</Text>
        <Switch
          value={manualScheduling}
          onValueChange={toggleSchedulingMode}
          thumbColor={manualScheduling ? "#fe88df" : "#ccc"}
        />
      </View>

      <Text style={styles.label}>Date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateButtonText}>
          {date.toDateString()} (Tap to change)
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(e, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <Text style={styles.label}>Start Time</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 7:00 AM"
        value={startTime}
        onChangeText={setStartTime}
      />

      <Text style={styles.label}>End Time</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 1:00 PM"
        value={endTime}
        onChangeText={setEndTime}
      />

      <Text style={styles.label}>Floor/Room</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Main Floor"
        value={floor}
        onChangeText={setFloor}
      />

      <Text style={styles.label}>Role</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Registration"
        value={role}
        onChangeText={setRole}
      />

      <Text style={styles.label}>Volunteers Needed</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={volunteersNeeded}
        onChangeText={setVolunteersNeeded}
      />

      <Text style={styles.label}>Overage Buffer</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={overageBuffer}
        onChangeText={setOverageBuffer}
      />

      <Text style={styles.label}>Team Leads Needed</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={teamLeadsNeeded}
        onChangeText={setTeamLeadsNeeded}
      />

      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, { height: 60 }]}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Create Shift</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 4,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#fe88df",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
});
