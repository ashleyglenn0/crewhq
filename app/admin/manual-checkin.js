import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenWrapper from "../../components/ScreenWrapper";
import Checkbox from "expo-checkbox";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";

const themes = {
  RenderATL: {
    primary: "#fe88df",
    text: "#711b43",
  },
  ATW: {
    primary: "#ffb89e",
    text: "#4f2b91",
  },
};

export default function ManualCheckInScreen() {
  const { event, name } = useLocalSearchParams();
  const router = useRouter();
  const theme = themes[event] || themes.RenderATL;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [feedback, setFeedback] = useState("");

  const showAlert = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  };

  const handleSubmit = async (statusType) => {
    if (!firstName || !lastName) {
      showAlert("⚠️ Please enter both names.");
      return;
    }

    if (statusType === "Checked In" && !agreed) {
      showAlert("⚠️ You must agree to the privacy policy.");
      return;
    }

    const timestamp = Timestamp.now();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("first_name", "==", firstName.trim()),
        where("last_name", "==", lastName.trim())
      );
      const snapshot = await getDocs(q);

      let role = "volunteer";
      let task = null;

      if (!snapshot.empty) {
        const user = snapshot.docs[0].data();
        role = user.role?.toLowerCase() || "volunteer";
        task = user.assignedTask || null;
      }

      // ✅ Add to check_ins
      await addDoc(collection(db, "check_ins"), {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        status: statusType,
        staff_qr: name,
        timestamp,
        event,
        role,
      });

      // ✅ If team lead, add to task_checkins
      if (role === "teamlead" && statusType === "Checked In") {
        await addDoc(collection(db, "task_checkins"), {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          task: task || "Unknown",
          role: "teamlead",
          status: "Check In for Task",
          checkinTime: timestamp,
          checkoutTime: null,
          teamLead: fullName,
          event,
        });
      }

      showAlert(
        `✅ ${
          role.charAt(0).toUpperCase() + role.slice(1)
        } ${statusType.toLowerCase()} successfully!`
      );

      setFirstName("");
      setLastName("");
      setAgreed(false);
    } catch (err) {
      console.error("❌ Error checking in/out:", err);
      showAlert("❌ Something went wrong. Try again.");
    }
  };

  return (
    <ScreenWrapper event={event}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.form}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          Manual Check-In
        </Text>

        {feedback !== "" && (
          <Text style={[styles.feedback, { color: theme.text }]}>
            {feedback}
          </Text>
        )}

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

        <View style={styles.checkboxRow}>
          <Checkbox
            value={agreed}
            onValueChange={setAgreed}
            color={theme.primary}
          />
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>
            I agree to the{" "}
            <Text
              style={{ textDecorationLine: "underline", fontWeight: "bold" }}
              onPress={() =>
                router.push({ pathname: "/privacy", params: { event } })
              }
            >
              privacy policy
            </Text>
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={() => handleSubmit("Checked In")}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.buttonText}>Check In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSubmit("Checked Out")}
            style={[styles.button, { backgroundColor: "#aaa" }]}
          >
            <Text style={styles.buttonText}>Check Out</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Back to Dashboard Button */}
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/admin/home", params: { event, name } })
          }
          style={[styles.backButton, { borderColor: theme.primary }]}
        >
          <Text style={[styles.backButtonText, { color: theme.primary }]}>
            ← Back to Dashboard
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  feedback: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 10,
    flexShrink: 1,
  },
  buttonGroup: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  backButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignSelf: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
