import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";

const themes = {
  RenderATL: { background: "#fdf0e2", text: "#711b43" },
  ATW: { background: "#f5f5f5", text: "#4f2b91" },
};

export default function AlreadyCheckedIn() {
  const router = useRouter();
  const db = getFirestore();

  const { event } = useLocalSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const start = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));
      const end = Timestamp.fromDate(new Date(new Date().setHours(23, 59, 59, 999)));

      // ✅ Check task_checkins to confirm they've already checked into task
      const checkinQuery = query(
        collection(db, "task_checkins"),
        where("first_name", "==", firstName),
        where("last_name", "==", lastName),
        where("event", "==", event),
        where("checkinTime", ">=", start),
        where("checkinTime", "<=", end)
      );

      const checkinSnapshot = await getDocs(checkinQuery);

      if (checkinSnapshot.empty) {
        setError("No active check-in found. Please see an Admin.");
        setLoading(false);
        return;
      }

      // ✅ Now lookup their role from scheduled_volunteers
      const roleQuery = query(
        collection(db, "scheduled_volunteers"),
        where("first_name", "==", firstName),
        where("last_name", "==", lastName),
        where("event", "==", event)
      );

      const roleSnapshot = await getDocs(roleQuery);

      let role = "volunteer"; // default
      if (!roleSnapshot.empty) {
        const data = roleSnapshot.docs[0].data();
        if (data.role === "teamlead") {
          role = "teamlead";
        }
      }

      // ✅ Write full session into SecureStore
      await SecureStore.setItemAsync(
        "volunteerSession",
        JSON.stringify({
          name: `${firstName} ${lastName}`,
          event,
          role,
        })
      );

      // ✅ Redirect correctly
      if (role === "teamlead") {
        router.replace(`/teamlead/dashboard?name=${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}&event=${event}`);
      } else {
        router.replace(`/volunteer/dashboard?name=${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}&event=${event}`);
      }

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const theme = themes[event] || themes.RenderATL;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={[styles.header, { color: theme.text }]}>Already Checked In?</Text>

      <TextInput
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={[styles.input, { borderColor: theme.text, color: theme.text }]}
        placeholderTextColor="#aaa"
      />

      <TextInput
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={[styles.input, { borderColor: theme.text, color: theme.text }]}
        placeholderTextColor="#aaa"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={theme.text} />
      ) : (
        <TouchableOpacity onPress={handleSubmit} style={[styles.button, { borderColor: theme.text }]}>
          <Text style={[styles.buttonText, { color: theme.text }]}>Submit</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 24 },
  input: { borderWidth: 2, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 16 },
  button: { padding: 14, borderWidth: 2, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  buttonText: { fontSize: 16, fontWeight: "bold" },
  error: { color: "red", fontWeight: "600", textAlign: "center", marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: "600" },
});
