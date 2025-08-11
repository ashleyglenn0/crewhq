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
      // Get current date for comparison (start and end of today in UTC)
      const todayStart = Timestamp.fromDate(
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 0, 0, 0))
      ); // start of today in UTC
      const todayEnd = Timestamp.fromDate(
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 23, 59, 59, 999))
      ); // end of today in UTC
  
      console.log("Checking for check-ins between", todayStart.toDate(), "and", todayEnd.toDate());
  
      // Check check-ins to confirm they've already checked in
      const checkinQuery = query(
        collection(db, "check_ins"),
        where("first_name", "==", firstName),
        where("last_name", "==", lastName),
        where("event", "==", event),
        where("timestamp", ">=", todayStart),
        where("timestamp", "<=", todayEnd)
      );
  
      const checkinSnapshot = await getDocs(checkinQuery);
      console.log("Check-in snapshot size:", checkinSnapshot.size); // Log the snapshot size
  
      if (checkinSnapshot.empty) {
        console.log("No active check-in found.");
        setError("No active check-in found. Please see an Admin.");
        setLoading(false);
        return;
      }
  
      console.log("Check-ins found:", checkinSnapshot.docs.map(doc => doc.data()));
  
      // Check if user is a team lead by querying the shifts collection
      const teamLeadQuery = query(
        collection(db, "shifts"),
        where("team_lead_uid", "array-contains", `${firstName} ${lastName}`), // Check if the team_lead_uid array contains the user's full name
        where("event", "==", event) // Ensure it matches the current event
      );
  
      const teamLeadSnapshot = await getDocs(teamLeadQuery);
      let role = "volunteer"; // default to volunteer
  
      if (!teamLeadSnapshot.empty) {
        role = "teamlead"; // If the user is found as a team lead, mark them as a teamlead
      }
  
      // Write full session into SecureStore
      await SecureStore.setItemAsync(
        "volunteerSession",
        JSON.stringify({
          name: `${firstName} ${lastName}`,
          event,
          role,
        })
      );
  
      // Redirect correctly based on the role
      if (role === "teamlead") {
        router.replace({
          pathname: "/teamlead/dashboard",
          params: { event, name: `${firstName} ${lastName}` },
        });
      } else {
        router.replace({
          pathname: "/volunteer/dashboard",
          params: { event, name: `${firstName} ${lastName}` },
        });
      }
  
    } catch (err) {
      console.error("Error occurred:", err);
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
