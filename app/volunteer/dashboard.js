import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import useVolunteerUid from "../hooks/useVolunteerUid";

// Theme colors for each event
const themes = {
  RenderATL: {
    background: "#fdf0e2",
    primary: "#fe88df",
    text: "#711b43",
    link: "#fe88df",
  },
  ATW: {
    background: "#f5f5f5",
    primary: "#ffb89e",
    text: "#4f2b91",
    link: "#ffb89e",
  },
  GovTechCon: {
    background: "FFFFFF",
    primary: "#17A2C0",
    text: "#161F4A",
    link: "#17A2C0",
  },
};

// Helper sanitize for SecureStore keys
const sanitizeKey = (str) => (str || "").replace(/[^a-zA-Z0-9._-]/g, "_");

export default function VolunteerDashboard() {
  const { name, event } = useLocalSearchParams();
  const uid = useVolunteerUid(name, event);
  const router = useRouter();
  const db = getFirestore();
  const theme = themes[event] || themes.RenderATL;

  const [floor, setFloor] = useState("");
  const [floorTeamLeads, setFloorTeamLeads] = useState([]);
  const [nextShift, setNextShift] = useState(null);
  const [impactData, setImpactData] = useState({
    shiftsCompleted: 0,
    totalHours: 0,
  });
  const isCheckedIn = nextShift?.checked_in ?? false;

  // Determine active schedule day
  const today = new Date();
  const day = today.getDate();
  let activeDay = day === 8 ? "June8" : "June11";
  if (day === 12) activeDay = "June12";
  if (day === 13) activeDay = "June13";

  const normalizedEvent =
    event?.toLowerCase() === "renderatl"
      ? "RenderATL"
      : event?.toLowerCase() === "atw"
      ? "ATW"
      : event;

  const briefingBookLinks = {
    ATW: "https://docs.google.com/document/d/1iktuFJzIWaYvGrSUggxPV_KAOjVp3g2utd2e68vTypc/edit?usp=sharing",
    RenderATL:
      "https://docs.google.com/document/d/1KzzK6V7cyZ_KwpKM4pATy4kuK5QPWo8aesVc1qTY8PE/edit?usp=sharing",
    GovTechCon: 
      "https://docs.google.com/document/d/1YumIrL1t2gu0QS2snl9XJdwQ_AbbTTnjOpM97Q6lXpE/edit?tab=t.0#heading=h.u5j8fojvpro9"
  };

  const quickTips = {
    RenderATL: (
      <Text style={[styles.cardText, { color: theme.text }]}>
        • Wi-Fi: render2025 / Password: atltech{"\n"}• Lost & Found: Check at HQ
        {"\n"}• Slack: #volunteers channel
      </Text>
    ),
    ATW: (
      <Text style={[styles.cardText, { color: theme.text }]}>
        • Wi-Fi: atl2025 / Password: techweek{"\n"}• Lost & Found: Visit Info
        Desk{"\n"}• Slack: #atltechweek-volunteers
      </Text>
    ),
    GovTechCon: (
      <Text style={[styles.cardText, { color: theme.text }]}>
        • Wi-Fi: govtech2025 / Password: connect{"\n"}• Lost & Found: Visit the
        Welcome Desk{"\n"}• Slack: #gtc-volunteers
      </Text>
    ),
  };

  // check if team lead and redirect
  useEffect(() => {
    const checkIfTeamLead = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "shifts"),
            where("team_lead_uid", "==", uid), // Check for the user's UID in the team_lead_uid field
            where("event", "==", event) // Ensure it matches the current event
          )
        );

        if (!snapshot.empty) {
          router.replace({
            pathname: "/teamlead/dashboard",
            params: { uid, name, event },
          });
        }
      } catch (error) {
        console.error("Error checking team lead status:", error);
      }
    };

    checkIfTeamLead();
  }, [uid, event]);

  // Load next shift
  useEffect(() => {
    const loadShift = async () => {
      const shift = await getUpcomingShift(uid, event);
      setNextShift(shift);
    };

    loadShift();
  }, [uid]);

  // Load volunteer's assigned floor
  useEffect(() => {
    const loadFloor = async () => {
      try {
        const key = `floor_${sanitizeKey(name)}_${sanitizeKey(event)}`;
        const cached = await SecureStore.getItemAsync(key);
        if (cached) {
          setFloor(cached);
          return;
        }

        const todayStr = new Date().toISOString().split("T")[0];

        const shiftQ = query(
          collection(db, "shifts"),
          where("event", "==", event),
          where("date", "==", todayStr)
        );

        const shiftSnap = await getDocs(shiftQ);
        let matchedFloor = null;

        for (const doc of shiftSnap.docs) {
          const shift = doc.data();
          const claimed = shift.claimed_by || [];

          const match = claimed.find(
            (v) =>
              v.first_name?.toLowerCase() + " " + v.last_name?.toLowerCase() ===
              name?.toLowerCase()
          );

          if (match && shift.floor) {
            matchedFloor = shift.floor;
            break;
          }
        }

        if (matchedFloor) {
          setFloor(matchedFloor);
          await SecureStore.setItemAsync(key, matchedFloor);
          return;
        }

        const fallbackQ = query(
          collection(db, "task_checkins"),
          where("name", "==", name),
          where("event", "==", event)
        );

        const fallbackSnap = await getDocs(fallbackQ);
        const doc = fallbackSnap.docs[0]?.data();

        if (doc?.floor) {
          setFloor(doc.floor);
          await SecureStore.setItemAsync(key, doc.floor);
        }
      } catch (error) {
        console.error("Error during loadFloor:", error);
      }
    };

    loadFloor();
  }, []);

  // Load assigned team leads
  useEffect(() => {
    if (!floor) return;

    const fetchTeamLeads = async () => {
      try {
        const formattedFloor = floor.toLowerCase().includes("floor")
          ? floor
          : `Floor ${floor}`;

        const leadsQuery = query(
          collection(db, "scheduled_volunteers"),
          where("assignment", "==", formattedFloor),
          where("role", "==", "teamlead")
        );

        const snapshot = await getDocs(leadsQuery);
        setFloorTeamLeads(snapshot.docs.map((doc) => doc.data()));
      } catch (error) {
        console.error("Error fetching team leads:", error);
      }
    };

    fetchTeamLeads();
  }, [floor]);

  const handleHelpRequest = async () => {
    try {
      await addDoc(collection(db, "help_requests"), {
        name: name?.split(" ")[0] || "Volunteer",
        event,
        floor: floor || "Main Floor",
        roleToNotify: "team_lead",
        timestamp: serverTimestamp(),
        resolved: false,
        escalatedToRapid: false,
        pickedUpBy: null,
        pickedUpAt: null,
      });

      Alert.alert(
        "Help Request Sent",
        `A team lead has been notified.${
          floor ? ` (Floor: ${floor})` : ""
        }\nPlease stay where you are.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Help request failed:", error);
      Alert.alert("Error", "Could not send your help request. Try again.");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Heads Up!",
      "Logging out does NOT check you out of your shift.\nPlease see a team lead or admin to check out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out Anyway",
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync("volunteerSession");
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollArea}>
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          👋 Welcome, {name?.split(" ")[0] || "Volunteer"}!
        </Text>

        <Text style={[styles.subText, { color: theme.text }]}>
          {nextShift ? (
            `🗓️ Your next scheduled shift starts at ${
              nextShift.start_time
            } on ${nextShift.date}. Please arrive at ${subtractThirtyMinutes(
              nextShift.start_time
            )}.`
          ) : (
            <>
              You have no shifts scheduled.{" "}
              <Text
                style={{ textDecorationLine: "underline", color: theme.link }}
                onPress={() =>
                  router.push({
                    pathname: "/volunteer/ViewSchedule",
                    params: { name, event, uid },
                  })
                }
              >
                Tap here to schedule your next shift.
              </Text>
            </>
          )}
        </Text>

        {/* Always show the Team Leads Card */}
        <View style={[styles.infoCard, { borderColor: theme.text }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            🧑‍🤝‍🧑 Your Team Leads
          </Text>

          {floor === "" ? (
            <Text style={[styles.cardText, { color: theme.text }]}>
              You haven't been assigned to a floor yet. Please check in with
              your team lead or admin.
            </Text>
          ) : floorTeamLeads.length > 0 ? (
            floorTeamLeads.map((lead, index) => (
              <Text
                key={index}
                style={[styles.cardText, { color: theme.text }]}
              >
                {lead.first_name} {lead.last_name}
              </Text>
            ))
          ) : (
            <Text style={[styles.cardText, { color: theme.text }]}>
              Team leads not yet assigned.
            </Text>
          )}
        </View>

        <View style={[styles.infoCard, { borderColor: theme.text }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            📌 Your Volunteer Snapshot
          </Text>

          {nextShift ? (
            <>
              {nextShift && (
                <Text>
                  📆 <Text style={styles.bold}>Next Shift:</Text>{" "}
                  {nextShift.start_time} - {nextShift.end_time}
                </Text>
              )}
              <Text>
                📍 <Text style={styles.bold}>Location:</Text> Floor{" "}
                {nextShift.floor || "TBD"}
              </Text>
              <Text>
                🧍 <Text style={styles.bold}>Assignment:</Text>{" "}
                {nextShift.role || "TBD"}
              </Text>
              <Text>
                📶 <Text style={styles.bold}>Status:</Text>{" "}
                {isCheckedIn ? "Checked In" : "Not Checked In"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.noShift}>
                You don’t have a shift scheduled right now.
              </Text>
              <Text style={styles.encouragement}>
                🙌 Thanks for being part of the team — your impact still counts!
              </Text>
            </>
          )}

          <View style={styles.divider} />

          <Text>
            ✅ <Text style={styles.bold}>Shifts Completed:</Text>{" "}
            {impactData.shiftsCompleted}
          </Text>
          <Text>
            ⏱️ <Text style={styles.bold}>Hours Volunteered:</Text>{" "}
            {impactData.totalHours}
          </Text>
        </View>

        {/* Quick Tips */}
        <View style={[styles.infoCard, { borderColor: theme.text }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            🧰 Quick Tips
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            {quickTips[event]}
          </Text>
        </View>

        {(event === "Render" || event === "ATW") && (
          <View style={styles.renderAppNote}>
            <Text style={[styles.renderAppText, { color: theme.text }]}>
              *The full schedule is available in the Render App.*
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://renderatl.com/app")}
            >
              <Text style={[styles.renderAppLink, { color: theme.text }]}>
                🔗 Tap here to download or open it
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View
        style={[
          styles.footer,
          { borderTopColor: theme.text, backgroundColor: theme.background },
        ]}
      >
        <IconButton
          label="Briefing"
          icon={<MaterialIcons name="menu-book" size={28} color={theme.text} />}
          onPress={() => {
            const url = briefingBookLinks[event];
            Linking.openURL(url);
          }}
          theme={theme}
        />
        <IconButton
          label="FAQ"
          icon={
            <MaterialIcons name="help-outline" size={28} color={theme.text} />
          }
          onPress={() =>
            Linking.openURL(
              "https://docs.google.com/document/d/1hfUp3M084ql5a4iMtezsJbVbQZEAnkUBMo63WZozphw"
            )
          }
          theme={theme}
        />
        <IconButton
          label="Schedule"
          icon={
            <MaterialIcons name="event-note" size={28} color={theme.text} />
          }
          onPress={() =>
            router.push({
              pathname: "/volunteer/VolunteerShiftView",
              params: { event, uid, name },
            })
          }
          theme={theme}
        />
        <IconButton
          label="Help"
          icon={
            <MaterialIcons name="support-agent" size={28} color={theme.text} />
          }
          onPress={handleHelpRequest}
          theme={theme}
        />
        <IconButton
          label="Logout"
          icon={<MaterialIcons name="logout" size={28} color={theme.text} />}
          onPress={handleLogout}
          theme={theme}
        />
      </View>
    </SafeAreaView>
  );
}

// Icon button reusable component
function IconButton({ label, icon, onPress, theme }) {
  return (
    <TouchableOpacity style={styles.iconButton} onPress={onPress}>
      {icon}
      <Text style={[styles.iconLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { padding: 24, paddingBottom: 100 },
  welcomeText: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subText: { fontSize: 16, textAlign: "center", marginBottom: 12 },
  scheduleCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  scheduleItem: { marginBottom: 12 },
  scheduleTime: { fontSize: 14, fontWeight: "600" },
  scheduleTitle: { fontSize: 15, marginTop: 2, fontWeight: "500" },
  scheduleSpeaker: { fontSize: 14, marginTop: 1 },
  scheduleLocation: { fontSize: 14, marginTop: 1, fontStyle: "italic" },
  infoCard: { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 20 },
  cardText: { fontSize: 14, lineHeight: 22 },
  renderAppNote: { marginTop: 8, marginBottom: 28, alignItems: "center" },
  renderAppText: { fontSize: 13, fontStyle: "italic", textAlign: "center" },
  renderAppLink: {
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "500",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 2,
    paddingVertical: 12,
  },
  iconButton: { alignItems: "center" },
  iconLabel: { marginTop: 4, fontSize: 14, fontWeight: "600" },
});
