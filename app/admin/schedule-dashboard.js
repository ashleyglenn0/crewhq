import React, { useState, useEffect } from "react";
import { View, useWindowDimensions, StyleSheet, Text, TouchableOpacity } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenWrapper from "../../components/ScreenWrapper";
import TodayScheduleTab from "../tabs/TodayScheduleTab";
import CreateShiftTab from "../tabs/CreateShiftTab";
import AssignmentsTab from "../tabs/AssignmentsTab";
import AISchedulerTab from "../tabs/AISchedulerTab";  // Import AISchedulerTab

// Event themes
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

export default function ScheduleDashboard() {
  const layout = useWindowDimensions();
  const router = useRouter();
  const { event = "RenderATL", name } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;

  // State to manage selected tab and manual scheduling mode
  const [index, setIndex] = useState(0);
  const [manualScheduling, setManualScheduling] = useState(true);  // State to track manual scheduling

  const [routes] = useState([
    { key: "today", title: "Today" },
    { key: "create", title: "Create Shift" },
    { key: "assignments", title: "Assignments" },
    { key: "ai", title: "AI Scheduler" },  // AI Scheduler tab
  ]);

  // Fetch scheduling mode for the event
  useEffect(() => {
    const fetchSchedulingMode = async () => {
      const eventDoc = await getDoc(doc(db, "events", event));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setManualScheduling(data.manual_scheduling ?? true);
      }
    };
    fetchSchedulingMode();
  }, [event]);

  // Disable the AI Scheduler tab when manual scheduling is enabled
  const renderScene = ({ route }) => {
    switch (route.key) {
      case "today":
        return <TodayScheduleTab event={event} name={name} />;
      case "create":
        return <CreateShiftTab event={event} name={name} setManualScheduling={setManualScheduling} />;
      case "assignments":
        return <AssignmentsTab event={event} name={name} />;
      case "ai":
        // Only render AI Scheduler if manualScheduling is false
        return manualScheduling ? (
          <Text style={{ textAlign: "center", marginTop: 50 }}>AI Scheduler is disabled in manual scheduling mode.</Text>
        ) : (
          <AISchedulerTab event={event} name={name} manualScheduling={manualScheduling} />
        );
      default:
        return null;
    }
  };

  return (
    <ScreenWrapper scroll={false} event={event}>
      <Text style={[styles.header, { color: theme.text }]}>📆 Schedule Dashboard</Text>
      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: "/admin/home", params: { event, name } })
        }
        style={[styles.backButton, { borderColor: theme.text }]}
      >
        <Text style={[styles.backButtonText, { color: theme.text }]}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            scrollEnabled
            indicatorStyle={{ backgroundColor: theme.primary }}
            style={{ backgroundColor: theme.background }}
            labelStyle={{ fontWeight: "600" }}
            activeColor={theme.text}
            inactiveColor="#888"
          />
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
