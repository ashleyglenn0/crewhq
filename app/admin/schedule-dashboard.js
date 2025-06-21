import React, { useState } from "react";
import { View, useWindowDimensions, StyleSheet, Text, TouchableOpacity } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenWrapper from "../../components/ScreenWrapper";
import TodayScheduleTab from "../tabs/TodayScheduleTab";
import CreateShiftTab from "../tabs/CreateShiftTab";
import AssignmentsTab from "../tabs/AssignmentsTab";
import AISchedulerTab from "../tabs/AISchedulerTab";

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

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "today", title: "Today" },
    { key: "create", title: "Create Shift" },
    { key: "assignments", title: "Assignments" },
    { key: "ai", title: "AI Scheduler" },
  ]);

  const renderScene = ({ route }) => {
    switch (route.key) {
      case "today":
        return <TodayScheduleTab event={event} name={name} />;
      case "create":
        return <CreateShiftTab event={event} name={name} />;
      case "assignments":
        return <AssignmentsTab event={event} name={name} />;
      case "ai":
        return <AISchedulerTab event={event} name={name} />;
      default:
        return null;
    }
  };

  return (
    <ScreenWrapper scroll={false} event={event}>
      <Text style={[styles.header, { color: theme.text }]}>
        📆 Schedule Dashboard
      </Text>
      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: "/admin/home", params: { event, name } })
        }
        style={[styles.backButton, { borderColor: theme.text }]}
      >
        <Text style={[styles.backButtonText, { color: theme.text }]}>
          ← Back to Dashboard
        </Text>
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
