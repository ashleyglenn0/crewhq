import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../../firebase/firebaseConfig";
import ScreenWrapper from "../../components/ScreenWrapper";

const themes = {
  RenderATL: {
    background: "#fdf0e2",
    primary: "#fe88df",
    text: "#711b43",
    errorBackground: "#ffeaea",
    errorBorder: "#ff4d4d",
  },
  ATW: {
    background: "#f5f5f5",
    primary: "#ffb89e",
    text: "#4f2b91",
    errorBackground: "#fbeaea",
    errorBorder: "#d04545",
  },
  GovTechCon: {
    background: "FFFFFF",
    primary: "#17A2C0",
    text: "#161F4A",
    errorBackground: "#fbeaea",
    errorBorder: "#d04545",
  }
};

export default function AlertsInbox() {
  const { event, role, name } = useLocalSearchParams();
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);

  const theme = themes[event] || themes.RenderATL;

  useEffect(() => {
    if (!event || !name) return;

    const q = query(collection(db, "alerts"), where("event", "==", event));

    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const filtered = all.filter(
        (a) =>
          a.severity === "error" &&
          a.sendPush === true &&
          !a.dismissedBy?.includes(name)
      );
      setAlerts(filtered);
    });

    return () => unsub();
  }, [event, name]);

  const dismissAlert = async (alertId) => {
    try {
      const ref = doc(db, "alerts", alertId);
      await updateDoc(ref, {
        dismissedBy: arrayUnion(name),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  const pickUpAlert = async (alertId) => {
    try {
      const ref = doc(db, "alerts", alertId);
      await updateDoc(ref, {
        pickedUpBy: name,
        pickedUpAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to pick up alert:", err);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const ref = doc(db, "alerts", alertId);
      await updateDoc(ref, {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: name,
      });

      // Auto-dismiss from UI
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  return (
    <ScreenWrapper scroll={false} event={event}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/admin/home",
            params: { name, event, role },
          })
        }
        style={[styles.backButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.backText, { color: theme.primary }]}>
          ← Back to Dashboard
        </Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>Urgent Alerts</Text>

      {role === "admin" && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/admin/SendAlert",
              params: { name, event },
            })
          }
          style={[styles.sendButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.sendText}>+ Send Alert</Text>
        </TouchableOpacity>
      )}

      {alerts.length === 0 ? (
        <Text style={[styles.noAlerts, { color: theme.text }]}>
          No urgent alerts right now.
        </Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: theme.errorBackground,
                  borderColor: theme.errorBorder,
                },
              ]}
            >
              <Text style={[styles.alertText, { color: theme.text }]}>
                {item.message}
              </Text>
              {item.pickedUpBy && !item.resolved && (
                <Text style={[styles.statusText, { color: theme.text }]}>
                  📌 Claimed by {item.pickedUpBy}
                </Text>
              )}

              {item.resolved && (
                <Text style={[styles.statusText, { color: theme.text }]}>
                  ✅ Resolved by {item.resolvedBy}
                </Text>
              )}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => pickUpAlert(item.id)}
                  style={[styles.adminBtn, { borderColor: theme.primary }]}
                >
                  <Text style={{ color: theme.primary }}>📌 Pick Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => resolveAlert(item.id)}
                  style={[
                    styles.adminBtn,
                    { borderColor: theme.primary, marginLeft: 8 },
                  ]}
                >
                  <Text style={{ color: theme.primary }}>✅ Resolve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => dismissAlert(item.id)}
                  style={[
                    styles.dismissButton,
                    { backgroundColor: theme.primary, marginLeft: "auto" },
                  ]}
                >
                  <Text style={styles.dismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    marginLeft: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },
  sendButton: {
    alignSelf: "center",
    marginVertical: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  noAlerts: {
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  alertBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  alertText: {
    fontSize: 16,
    marginBottom: 12,
  },
  dismissButton: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dismissText: {
    color: "#fff",
    fontWeight: "600",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  adminBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
