import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function PrivacyPolicy() {
  const { event } = useLocalSearchParams();
  const router = useRouter();
  const theme = themes[event] || themes.RenderATL;

  return (
    <ScreenWrapper event={event}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          Privacy Policy
        </Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          This app is operated by{" "}
          <Text style={{ fontWeight: "bold" }}>CrewHQ</Text>, a product of{" "}
          <Text style={{ fontWeight: "bold" }}>RayCodes LLC</Text>. It is used
          by partner events, including RenderATL and ATL Tech Week, to
          coordinate and manage volunteer operations.
        </Text>

        <Text style={[styles.paragraph, { color: theme.text }]}>
          When you check in, CrewHQ collects your first and last name to track
          attendance, assign tasks, and log volunteer activity during the event.
          Your information is securely stored in our system and is only
          accessible to authorized event administrators.
        </Text>

        <Text style={[styles.paragraph, { color: theme.text }]}>
          CrewHQ does not sell, share, or disclose your personal data to third
          parties. Your name may appear in reports used by event organizers for
          real-time staffing, rotation timing, and analytics.
        </Text>

        <Text style={[styles.paragraph, { color: theme.text }]}>
          This data is retained only for the duration of the event unless needed
          for operational review or internal reporting.
        </Text>

        <Text style={[styles.paragraph, { color: theme.text }]}>
          If you have concerns about how your information is used at a specific
          event, please contact that event’s organizer or visit the admin desk
          on-site. CrewHQ is committed to protecting your privacy while enabling
          smooth volunteer experiences.
        </Text>

        <Text style={styles.footer}>Last updated: April 2025</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 100,
  },
  logo: {
    width: 100,
    height: 60,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 40,
    color: "#777",
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
