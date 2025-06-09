import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ModalSelector from "react-native-modal-selector";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from 'expo-secure-store';


const themes = {
  RenderATL: {
    background: "#fdf0e2",
    text: "#711b43",
  },
  ATW: {
    background: "#f5f5f5",
    text: "#4f2b91",
  },
};

export default function TaskCheckIn() {
  const { event = '', floor = '', teamlead: teamLead = '' } = useLocalSearchParams();
  const router = useRouter();
  const db = getFirestore();
  const theme = themes[event] || themes.RenderATL;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("Check In");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const statusOptions = [
    { key: "Check In", label: "Check In" },
    { key: "Check Out for Break", label: "Check Out for Break" },
    { key: "Check In from Break", label: "Check In from Break" },
    { key: "Check Out", label: "Check Out" },
  ];

  const verifyAdminCheckIn = async (first, last, minWaitMinutes = 1) => {
    const start = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));
    const end = Timestamp.fromDate(
      new Date(new Date().setHours(23, 59, 59, 999))
    );

    const q = query(
      collection(db, "check_ins"),
      where("first_name", "==", first),
      where("last_name", "==", last),
      where("status", "==", "Checked In"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        allowed: false,
        message: "⚠️ No admin check-in found for today.",
      };
    }

    const checkInTime = snapshot.docs[0].data().timestamp.toDate();
    const now = new Date();
    const diff = (now - checkInTime) / 60000;

    if (diff < minWaitMinutes) {
      return {
        allowed: false,
        message: `⚠️ Wait ${Math.ceil(minWaitMinutes - diff)} more minute(s).`,
      };
    }

    return { allowed: true };
  };

  const handleSubmit = async () => {
    setError("");
    setSuccessMessage("");

    if (!firstName || !lastName) {
      setError("❌ Please enter both first and last names.");
      return;
    }

    try {
      const { allowed, message } = await verifyAdminCheckIn(
        firstName,
        lastName,
        1
      );
      if (!allowed) {
        setError(message);
        return;
      }

      const timestamp = Timestamp.now();
      const id = `${firstName}_${lastName}_${timestamp.toMillis()}`;

      await setDoc(doc(db, "task_checkins", id), {
        first_name: firstName,
        last_name: lastName,
        floor: floor || "Unknown",
        status,
        checkinTime: timestamp,
        checkoutTime: null,
        teamlead: teamLead || "Unknown",
        event: event || "Unknown",
      });

      setSuccessMessage(`✅ ${firstName} ${lastName} successfully checked in!`);
      await SecureStore.setItemAsync('volunteerSession', JSON.stringify({
        name: `${firstName} ${lastName}`,
        event,
        role: 'volunteer'
      }));
    } catch (err) {
      console.error(err);
      setError("❌ Something went wrong. Please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollArea}>
        {teamLead && (
          <TouchableOpacity
            onPress={() =>
              router.replace(`/teamlead/qr?name=${encodeURIComponent(teamLead)}&event=${event}`)
            }
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: theme.text }]}>Task Check-In</Text>
        <Text style={[styles.sub, { color: theme.text }]}>
          Team Lead: {teamLead || "N/A"}
        </Text>
        <Text style={[styles.sub, { color: theme.text }]}>
          Floor: {floor || "N/A"}
        </Text>
        <Text style={[styles.sub, { color: theme.text }]}>
          Event: {event || "N/A"}
        </Text>

        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, { borderColor: theme.text, color: theme.text }]}
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, { color: theme.text }]}>Status</Text>
        <ModalSelector
          data={statusOptions}
          initValue={status}
          onChange={(option) => setStatus(option.key)}
          style={[styles.selectorWrapper, { borderColor: theme.text }]}
          initValueTextStyle={{ color: theme.text }}
          selectTextStyle={{ color: theme.text }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {successMessage ? (
          <Text style={styles.success}>{successMessage}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.button, { borderColor: theme.text }]}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Submit</Text>
        </TouchableOpacity>

        {successMessage && (
          <>
            {teamLead ? (
              <>
                <TouchableOpacity
                  onPress={() =>
                    router.replace(
                      `/teamlead/dashboard?name=${encodeURIComponent(teamLead)}&event=${event}`
                    )
                  }
                  style={[styles.secondaryButton, { borderColor: theme.text }]}
                >
                  <Text style={[styles.secondaryText, { color: theme.text }]}>
                    ← Back to Dashboard
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.replace(
                      `/teamlead/qr?name=${encodeURIComponent(teamLead)}&event=${event}`
                    )
                  }
                  style={[styles.secondaryButton, { borderColor: theme.text }]}
                >
                  <Text style={[styles.secondaryText, { color: theme.text }]}>
                    ← Back to QR Code
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  router.replace(
                    `/volunteer/dashboard?name=${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}&event=${event}`
                  )
                }
                style={[styles.secondaryButton, { borderColor: theme.text }]}
              >
                <Text style={[styles.secondaryText, { color: theme.text }]}>
                  → Go to My Dashboard
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { padding: 24, paddingBottom: 80 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: { fontSize: 16, textAlign: "center", marginBottom: 4 },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  label: { fontSize: 16, marginBottom: 8 },
  selectorWrapper: {
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 24,
    padding: 10,
  },
  button: {
    padding: 14,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { fontSize: 16, fontWeight: "bold" },
  secondaryButton: {
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryText: { fontSize: 15, fontWeight: "600" },
  success: {
    color: "green",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  error: {
    color: "red",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
