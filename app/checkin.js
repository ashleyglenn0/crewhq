import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { checkSessionManually } from "./hooks/checkSessionManually";
import * as SecureStore from "expo-secure-store";

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
};

const makeSecureKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

export default function CheckInScreen() {
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleCheckIn = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Missing Info", "Please enter your full name.");
      return;
    }

    if (!agreed) {
      Alert.alert("Required", "You must agree to the privacy policy.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const secureKeyName = makeSecureKey(fullName);
    const secureKeyEvent = makeSecureKey(event);

    try {
      const userQuery = query(
        collection(db, "users"),
        where("first_name", "==", firstName.trim()),
        where("last_name", "==", lastName.trim())
      );
      const snapshot = await getDocs(userQuery);

      const timestamp = Timestamp.now();
      const resolvedRole = !snapshot.empty
        ? snapshot.docs[0].data().role?.toLowerCase()
        : "volunteer";

      const alreadyCheckedIn = await checkSessionManually(
        event,
        fullName,
        resolvedRole,
        router
      );
      if (alreadyCheckedIn) return;

      await addDoc(collection(db, "check_ins"), {
        first_name: firstName,
        last_name: lastName,
        event,
        role: resolvedRole,
        status: "Checked In",
        timestamp,
      });

      await SecureStore.setItemAsync(
        `checkedIn_${secureKeyName}_${secureKeyEvent}`,
        "true"
      );
      await SecureStore.setItemAsync(
        `checkInTime_${secureKeyName}_${secureKeyEvent}`,
        Date.now().toString()
      );

      if (resolvedRole === "teamlead") {
        const task = snapshot.docs[0]?.data().assignedTask || "Unknown";

        await addDoc(collection(db, "task_checkins"), {
          first_name: firstName,
          last_name: lastName,
          role: "teamlead",
          task,
          status: "Check In for Task",
          checkinTime: timestamp,
          checkoutTime: null,
          event,
          teamLead: fullName,
        });

        router.push({
          pathname: "/teamlead/dashboard",
          params: { event, name: fullName },
        });
      } else {
        router.push({
          pathname: "/volunteer/dashboard",
          params: { event, name: fullName },
        });
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const handleCheckOut = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Missing Info", "Please enter your full name to check out.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      // Check if check-in exists first
      const checkInQuery = query(
        collection(db, "check_ins"),
        where("first_name", "==", firstName.trim()),
        where("last_name", "==", lastName.trim()),
        where("event", "==", event)
      );

      const checkInSnapshot = await getDocs(checkInQuery);

      if (checkInSnapshot.empty) {
        Alert.alert(
          "No Check-In Found",
          "You must check in before you can check out."
        );
        return;
      }

      // Pull role (if we want to store role on check out too)
      const userQuery = query(
        collection(db, "users"),
        where("first_name", "==", firstName.trim()),
        where("last_name", "==", lastName.trim())
      );
      const userSnapshot = await getDocs(userQuery);

      const resolvedRole = !userSnapshot.empty
        ? userSnapshot.docs[0].data().role?.toLowerCase()
        : "volunteer";

      const timestamp = Timestamp.now();

      await addDoc(collection(db, "check_outs"), {
        first_name: firstName,
        last_name: lastName,
        event,
        role: resolvedRole,
        status: "Checked Out",
        timestamp,
      });

      Alert.alert("Success", "You have successfully checked out!");
      setFirstName("");
      setLastName("");
      setAgreed(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong during check out.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Check In</Text>

      <TextInput
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={[styles.input, { borderColor: theme.primary }]}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={[styles.input, { borderColor: theme.primary }]}
        placeholderTextColor="#999"
      />

      <TouchableOpacity onPress={() => setAgreed(!agreed)}>
        <Text style={{ textAlign: "center", color: theme.text }}>
          {agreed ? "✅" : "⬜️"} I agree to the privacy policy
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleCheckIn}
      >
        <Text style={styles.buttonText}>Check In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.outlineButton,
          { borderColor: theme.primary, marginTop: 12 },
        ]}
        onPress={handleCheckOut}
      >
        <Text style={[styles.outlineButtonText, { color: theme.primary }]}>
          Check Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  outlineButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  
  outlineButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
