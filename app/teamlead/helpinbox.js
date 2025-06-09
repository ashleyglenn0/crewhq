import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function HelpInbox() {
  const { name, event } = useLocalSearchParams();
  const router = useRouter();
  const db = getFirestore();
  const theme = themes[event] || themes.RenderATL;
  const [teamLeadFloor, setTeamLeadFloor] = useState("Main Floor");
  const [helpRequests, setHelpRequests] = useState([]);

  useEffect(() => {
    const fetchHelpRequests = async () => {
      try {
        const now = Date.now() / 1000;

        let q;
        if (teamLeadFloor === "Rapid Response") {
          q = query(
            collection(db, "help_requests"),
            where("event", "==", event),
            where("resolved", "==", false),
            where("pickedUpBy", "==", null),
            where("roleToNotify", "==", "team_lead")
          );
        } else {
          q = query(
            collection(db, "help_requests"),
            where("event", "==", event),
            where("resolved", "==", false),
            where("floor", "==", teamLeadFloor)
          );
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map((doc) => {
            const d = doc.data();
            const ageInSeconds = now - d.timestamp?.seconds;
            const isSecondAlert =
              teamLeadFloor === "Rapid Response" &&
              d.pickedUpBy === null &&
              ageInSeconds >= 120;

            return {
              ...d,
              id: doc.id,
              isSecondAlert,
            };
          })
          .filter((d) =>
            teamLeadFloor === "Rapid Response" ? d.isSecondAlert : true
          );

        setHelpRequests(data);
      } catch (error) {
        console.error("Error fetching help requests:", error);
      }
    };

    fetchHelpRequests();
  }, [event, teamLeadFloor]);

  const handlePickUp = async (requestId) => {
    try {
      const ref = doc(db, "help_requests", requestId);
      await updateDoc(ref, {
        pickedUpBy: name,
        pickedUpAt: new Date(),
      });
      setHelpRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error claiming request:", error);
    }
  };

  const handleResolveHelpRequest = async (requestId) => {
    try {
      const requestRef = doc(db, "help_requests", requestId);
      await updateDoc(requestRef, {
        resolved: true,
        resolvedBy: name,
        resolvedAt: new Date(),
      });

      // Immediately remove from UI
      setHelpRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Failed to resolve help request:", err);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text }]}>🆘 Help Inbox</Text>
        <Text style={[styles.sub, { color: theme.text }]}>
          Floor: {teamLeadFloor}
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push(`/teamlead/dashboard?name=${name}&event=${event}`)
          }
          style={[styles.backBtn, { borderColor: theme.text }]}
        >
          <Text style={[styles.backText, { color: theme.text }]}>
            ← Back to Dashboard
          </Text>
        </TouchableOpacity>

        {helpRequests.length > 0 ? (
          helpRequests.map((req) => (
            <View
              key={req.id}
              style={[styles.card, { borderColor: theme.text }]}
            >
              <Text style={[styles.text, { color: theme.text }]}>
                {req.name} • {req.floor} •{" "}
                {new Date(req.timestamp?.seconds * 1000).toLocaleTimeString()}
                {req.isSecondAlert ? " 🚨 SECOND ALERT" : ""}
              </Text>
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.btn, { borderColor: theme.text }]}
                  onPress={() => handlePickUp(req.id)}
                >
                  <Text style={{ color: theme.text }}>Pick Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btn,
                    { borderColor: theme.text, marginLeft: 8 },
                  ]}
                  onPress={() => handleResolveHelpRequest(req.id)}
                >
                  <Text style={{ color: theme.text }}>Resolve ✅</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: theme.text }}>No open help requests.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  sub: { fontSize: 16, marginBottom: 20 },
  card: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  text: { fontSize: 15, marginBottom: 6 },
  btn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  backBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  btnGroup: {
    flexDirection: "row",
    marginTop: 6,
  },
});
