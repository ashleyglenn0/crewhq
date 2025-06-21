import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
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

export default function FloorOverview() {
  const { event, floor } = useLocalSearchParams();
  const router = useRouter();
  const db = getFirestore();
  const theme = themes[event] || themes.RenderATL;

  const [checkedInVolunteers, setCheckedInVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckedIn = async () => {
      try {
        const q = query(
          collection(db, "task_checkins"),
          where("floor", "==", floor),
          where("status", "==", "Check In")
        );

        const snapshot = await getDocs(q);
        const volunteers = snapshot.docs.map((doc) => doc.data());
        setCheckedInVolunteers(volunteers);
      } catch (err) {
        console.error("Error fetching check-ins:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckedIn();
  }, [floor]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.header, { color: theme.text }]}>
        📝 Floor Roster
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.text} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
          </TouchableOpacity>
          {checkedInVolunteers.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No volunteers checked in yet.
            </Text>
          ) : (
            checkedInVolunteers.map((vol, idx) => (
              <View
                key={idx}
                style={[styles.volunteerCard, { borderColor: theme.text }]}
              >
                <Text style={[styles.name, { color: theme.text }]}>
                  {vol.first_name} {vol.last_name}
                </Text>
                <Text style={[styles.subHeader, { color: theme.text }]}>
                  Floor: {floor || "N/A"}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  list: { gap: 12 },
  volunteerCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
  },
  name: { fontSize: 18, fontWeight: "600" },
  emptyText: { fontSize: 16, textAlign: "center" },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
});
