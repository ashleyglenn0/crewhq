import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { db } from "../../firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useRouter, useLocalSearchParams } from "expo-router";

console.log("Rendering ScheduleSafeHydrationBypass screen");

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
};

const getLocalDateString = (date) => {
  // Handle null/undefined
  if (!date) {
    console.warn("getLocalDateString received null/undefined date");
    return new Date().toISOString().split("T")[0];
  }

  // Convert to Date object if it isn't already
  const validDate = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(validDate.getTime())) {
    console.warn("getLocalDateString received invalid date:", date);
    return new Date().toISOString().split("T")[0];
  }

  try {
    // Simpler approach: just format the date directly to YYYY-MM-DD in EST
    return validDate.toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
  } catch (error) {
    console.warn("Error in getLocalDateString:", error, "Date:", date);
    return new Date().toISOString().split("T")[0];
  }
};

// NEW: Function to convert date to Firebase format
const getFirebaseDateString = (date) => {
  if (!date) return null;

  const validDate = date instanceof Date ? date : new Date(date);

  if (isNaN(validDate.getTime())) {
    console.warn("getFirebaseDateString received invalid date:", date);
    return null;
  }

  try {
    // Convert to EST/EDT and format like "Wednesday, June 11, 2025"
    return validDate.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.warn("Error in getFirebaseDateString:", error, "Date:", date);
    return null;
  }
};

export default function ScheduleSafeHydrationBypass() {
  // ✅ ALL HOOKS MUST BE AT THE TOP
  const router = useRouter();
  const { name, event } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(event || "RenderATL"); // Make event dynamic

  const theme = themes[currentEvent] || themes.RenderATL;

  // ✅ Assign Date AFTER hydration
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate]);

  // ✅ Fetch schedule effect - now at the top with other hooks
  useEffect(() => {
    if (!selectedDate) return; // Guard clause instead of early return

    const fetchSchedule = async () => {
      const firebaseDateString = getFirebaseDateString(selectedDate);
      console.log("Querying Firebase for date:", firebaseDateString);
      console.log("NOTE: Temporarily querying WITHOUT event filter");

      if (!firebaseDateString) {
        console.warn("Could not convert selectedDate to Firebase format");
        setSchedule([]);
        return;
      }

      try {
        // Temporarily query without event filter
        const q = query(
          collection(db, "scheduled_volunteers"),
          where("date", "==", firebaseDateString)
          // Removed: where("event", "==", currentEvent)
        );

        const snapshot = await getDocs(q);
        const scheduleData = snapshot.docs.map((doc) => doc.data());
        console.log("Found schedule data:", scheduleData);
        setSchedule(scheduleData);
      } catch (error) {
        console.error("Error fetching schedule:", error);
        setSchedule([]);
      }
    };

    fetchSchedule();
  }, [selectedDate]);

  // ✅ Block rendering until date is loaded - AFTER all hooks
  if (!selectedDate) {
    return null;
  }

  const handleExport = async () => {
    const firebaseDateString = getFirebaseDateString(selectedDate);
    const rows = [
      ["First Name", "Last Name", "Shift", "Role"],
      ...schedule.map((v) => [
        v.first_name,
        v.last_name,
        v.shift,
        v.role || "Volunteer",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const fileUri =
      FileSystem.documentDirectory +
      `schedule-${getLocalDateString(selectedDate)}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri);
  };

  return (
    <ScreenWrapper event={currentEvent} scroll={false}>
      <View style={{ marginTop: 60, marginBottom: 20 }}>
        <Text style={[styles.title, { color: theme.text }]}>
          {currentEvent} Schedule
        </Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Volunteers scheduled for {getLocalDateString(selectedDate)}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() =>
              setCurrentEvent(
                currentEvent === "RenderATL" ? "ATW" : "RenderATL"
              )
            }
            style={[styles.switchButton, { borderColor: theme.primary }]}
          >
            <Text style={[styles.switchButtonText, { color: theme.primary }]}>
              Switch to {currentEvent === "RenderATL" ? "ATW" : "RenderATL"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.dateButtonText}>Change Date</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() =>
            router.push({ 
              pathname: "/admin/home", 
              params: { event: currentEvent, name } 
            })
          }
          style={[styles.backButton, { borderColor: theme.text }]}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}
      </View>

      <FlatList
        data={schedule}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: theme.primary }]}>
            <Text style={[styles.cell, { color: theme.text }]}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={[styles.cell, { color: theme.text }]}>
              {item.shift}
            </Text>
            <Text style={[styles.cell, { color: theme.text }]}>
              {item.role || "Volunteer"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: theme.text, textAlign: "center" }}>
            No volunteers scheduled.
          </Text>
        }
      />

      <TouchableOpacity
        onPress={handleExport}
        style={[styles.exportButton, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.exportText}>📤 Export to CSV</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 14, marginBottom: 16, textAlign: "center" },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
  },
  switchButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 120,
  },
  dateButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 6,
    padding: 12,
    backgroundColor: "#fff",
  },
  cell: {
    fontSize: 16,
    marginBottom: 4,
  },
  exportButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  exportText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});