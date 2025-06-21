import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import ScreenWrapper from "../../components/ScreenWrapper";
import { MaterialIcons } from "@expo/vector-icons";
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
    text: "#161F4A"
  }
};

export default function AdminHome() {
  const { event, name } = useLocalSearchParams();
  const router = useRouter();

  const [currentEvent, setCurrentEvent] = useState(event || "RenderATL");
  const [checkIns, setCheckIns] = useState(0);
  const [checkOuts, setCheckOuts] = useState(0);
  const [noShows, setNoShows] = useState(0);
  const [scheduled, setScheduled] = useState(0);
  const [rotations, setRotations] = useState([]);

  const theme = themes[currentEvent] || themes.RenderATL;

  // Extract first name only
  const firstName = name ? name.split('_')[0] : '';

  const handleSwitchEvent = () => {
    const newEvent = currentEvent === "RenderATL" ? "ATW" : "RenderATL";
    setCurrentEvent(newEvent);
  };

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0));
      const end = new Date(today.setHours(23, 59, 59, 999));

      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      const checkInQuery = query(
        collection(db, "check_ins"),
        where("event", "==", currentEvent),
        where("status", "==", "Checked In"),
        where("timestamp", ">=", startTs),
        where("timestamp", "<=", endTs)
      );

      const checkOutQuery = query(
        collection(db, "check_ins"),
        where("event", "==", currentEvent),
        where("status", "==", "Checked Out"),
        where("timestamp", ">=", startTs),
        where("timestamp", "<=", endTs)
      );

      const scheduledQuery = query(
        collection(db, "scheduled_volunteers"),
        where("event", "==", currentEvent)
      );

      const [ciSnap, coSnap, schedSnap] = await Promise.all([
        getDocs(checkInQuery),
        getDocs(checkOutQuery),
        getDocs(scheduledQuery),
      ]);

      setCheckIns(ciSnap.size);
      setCheckOuts(coSnap.size);
      setScheduled(schedSnap.size);
      setNoShows(Math.max(0, schedSnap.size - ciSnap.size));
    };

    const fetchRotations = async () => {
      const now = new Date();
      const q = query(
        collection(db, "task_checkins"),
        where("checkoutTime", "==", null),
        where("event", "==", currentEvent)
      );

      const snapshot = await getDocs(q);
      const twoHours = 2 * 60 * 60 * 1000;
      const threeHours = 3 * 60 * 60 * 1000;

      const overdue = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const checkIn = new Date(data.checkinTime.seconds * 1000);
          const duration = now - checkIn;
          const limit = data.task.toLowerCase().includes("food")
            ? twoHours
            : threeHours;

          if (duration > limit) {
            return {
              name: `${data.first_name} ${data.last_name}`,
              task: data.task,
              overdueBy: Math.floor((duration - limit) / 60000),
            };
          }
          return null;
        })
        .filter(Boolean);

      setRotations(overdue);
    };

    fetchStats();
    fetchRotations();
  }, [currentEvent]);

  const coverage = scheduled > 0 ? Math.round((checkIns / scheduled) * 100) : 0;

  return (
    <ScreenWrapper event={currentEvent} scroll={true}>
      <Text style={[styles.heading, { color: theme.text }]}>
        Welcome, {firstName}
      </Text>
      <Text style={[styles.subheading, { color: theme.text }]}>
        Event: {currentEvent}
      </Text>

      <TouchableOpacity
        onPress={handleSwitchEvent}
        style={[styles.switchButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.switchButtonText, { color: theme.primary }]}>
          Switch to {currentEvent === "RenderATL" ? "ATW" : "RenderATL"}
        </Text>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.cardGrid}>
        <StatCard label="Check-Ins" value={checkIns} theme={theme} />
        <StatCard label="Check-Outs" value={checkOuts} theme={theme} />
        <StatCard label="No-Shows" value={noShows} theme={theme} />
        <StatCard label="Coverage" value={`${coverage}%`} theme={theme} />
      </View>

      {/* Rotations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Volunteers to Rotate
        </Text>
        {rotations.length === 0 ? (
          <Text style={{ color: theme.text }}>
            ✅ All volunteers are within limits.
          </Text>
        ) : (
          rotations.map((v, idx) => (
            <Text key={idx} style={{ color: theme.text }}>
              • {v.name} ({v.task}) — Overdue by {v.overdueBy} min
            </Text>
          ))
        )}
      </View>

      {/* Primary Actions */}
      <View style={styles.primaryGroup}>
        <ActionButton
          label="Manual Check-In"
          onPress={() =>
            router.push({
              pathname: "/admin/manual-checkin",
              params: { name, event: currentEvent },
            })
          }
          theme={theme}
        />
        <ActionButton
          label="Show My QR Code"
          onPress={() =>
            router.push({
              pathname: "/admin/show-qr",
              params: { name, event: currentEvent },
            })
          }
          theme={theme}
        />
      </View>

      {/* Secondary Actions */}
      <View style={styles.iconGroup}>
        <IconButton
          iconName="calendar-today"
          label="Schedule"
          onPress={() =>
            router.push({
              pathname: "/admin/schedule-dashboard",
              params: { name, event: currentEvent },
            })
          }
          theme={theme}
        />
        <IconButton
          iconName="assignment"
          label="Tasks"
          onPress={() =>
            router.push({
              pathname: "/admin/task-dashboard",
              params: { name, event: currentEvent },
            })
          }
          theme={theme}
        />
        <IconButton
          iconName="notifications"
          label="Alert"
          onPress={() =>
            router.push({
              pathname: "/alerts/AlertsInbox",
              params: { name, event: currentEvent, role: "admin" },
            })
          }
          theme={theme}
        />
        <IconButton
          iconName="bar-chart"
          label="Reports"
          onPress={() =>
            router.push({
              pathname: "/admin/reports",
              params: { name, event: currentEvent },
            })
          }
          theme={theme}
        />
        <IconButton
          iconName="logout"
          label="Logout"
          onPress={async () => {
            await SecureStore.deleteItemAsync("volunteerSession");
            router.replace("/");
          }}
          theme={theme}
        />
      </View>
    </ScreenWrapper>
  );
}

function StatCard({ label, value, theme }) {
  return (
    <View style={[styles.card, { borderColor: theme.primary }]}>
      <Text style={[styles.cardLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: theme.primary }]}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor: theme.primary }]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function IconButton({ iconName, label, onPress, theme }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.iconButton}>
      <MaterialIcons name={iconName} size={28} color={theme.text} />
      <Text style={[styles.iconLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 16,
    marginBottom: 12,
  },
  switchButton: {
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  section: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  primaryGroup: {
    marginBottom: 12,
    gap: 16,
  },
  iconGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    alignItems: "center",
    gap: 4,
  },
  iconLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 60,
  },
});