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
  GovTechCon: {
    background: "FFFFFF",
    primary: "#17A2C0",
    text: "#161F4A",
  },
};

const makeSecureKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

export default function SignUpForm() {
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleSignUp = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Missing Info", "Please enter your full name.");
      return;
    }

    if (!agreed) {
      Alert.alert("Required", "You must agree to the privacy policy.");
      return;
    }

    try {
      const userQuery = query(
        collection(db, "volunteers"),
        where("first_name", "==", firstName.trim()),
        where("last_name", "==", lastName.trim()),
        where("event", "==", event)
      );
      const snapshot = await getDocs(userQuery);

      if (!snapshot.empty) {
        Alert.alert(
          "Already Signed Up",
          "You're already registered as a volunteer for this event."
        );
        return;
      }

      await addDoc(collection(db, "volunteers"), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        event,
        agreedToPrivacy: true,
        signed_up_at: Timestamp.now(),
      });

      router.push({
        pathname: "/volunteer/dashboard",
        params: { event, name: `${firstName.trim()} ${lastName.trim()}` },
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ position: "absolute", top: 60, left: 24 }}
      >
        <Text style={{ color: theme.primary, fontSize: 16 }}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        Sign Up To Volunteer
      </Text>
      <Text style={[styles.subTitle, { color: theme.text }]}>
        We're so glad to have you! To sign up for {event} please sign up.
      </Text>

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
        style={[styles.button, { backgroundColor: theme.primary, opacity: 1 }]}
        onPress={handleSignUp}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
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
  subTitle: {
    fontSize: 16,
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
    alignItems: "center",
    borderWidth: 2,
  },
  outlineButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});

