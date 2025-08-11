import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenWrapper from "../components/ScreenWrapper";

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

export default function RoleSelectScreen() {
  const router = useRouter();
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;

  const handleSignUp = () => {
    router.push({ pathname: "/SignUpForm", params: { event } });
  };

  const handleScan = () => {
    router.push({ pathname: "/admin/ScanAdminQR", params: { event } });
  };

  const handlePriorCheckIn = () => {
    router.push({ pathname: "/AlreadyCheckedIn", params: { event } });
  };

  const handleAdmin = () => {
    router.push({ pathname: "/admin/login", params: { event } });
  };

  return (
    <ScreenWrapper event={event} scroll={true}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]}>
          Welcome to {event}
        </Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Choose your role to continue
        </Text>

        <TouchableOpacity
          onPress={handleSignUp}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.buttonText}>🙋 Sign Up to Volunteer</Text>
        </TouchableOpacity>

        <Text style={[styles.divider, { color: theme.text }]}>──────── OR ────────</Text>

        <TouchableOpacity
          onPress={handleScan}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.buttonText}>📷 Scan Admin QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePriorCheckIn}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.buttonText}>✅ Already Checked In?</Text>
        </TouchableOpacity>

        <Text style={[styles.divider, { color: theme.text }]}>────── Staff Only ──────</Text>

        <TouchableOpacity
          onPress={handleAdmin}
          style={[styles.button, { backgroundColor: "#ccc" }]}
        >
          <Text style={[styles.buttonText, { color: "#000" }]}>🔒 I’m an Admin</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: theme.text }]}>
          Admins must start check-in sessions before others may proceed.
        </Text>
      </View>
    </ScreenWrapper>
  );
}


const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    padding: 8,
    zIndex: 1,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  center: {
    alignItems: "center",
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    marginBottom: 20,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  footerText: {
    fontSize: 12,
    marginTop: 40,
    textAlign: "center",
    opacity: 0.7,
  },
  divider: {
    fontSize: 14,
    marginVertical: 10,
    textAlign: "center",
    fontWeight: "500",
    opacity: 0.6,
  },
});
