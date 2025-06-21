import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";

import ScreenWrapper from "../../components/ScreenWrapper";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

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

export default function TaskDashboardScreen() {
  const { event, name } = useLocalSearchParams();
  const router = useRouter();
  const [currentEvent, setCurrentEvent] = useState(event || "RenderATL");
  const [taskData, setTaskData] = useState({});
  const [expandedTask, setExpandedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [newTask, setNewTask] = useState("");

  const theme = themes[currentEvent] || themes.RenderATL;

  const tasks =
    currentEvent === "ATL Tech Week"
      ? [
          "Registration",
          "Room Setup",
          "Tech Support",
          "Food Truck Park",
          "Stage Crew",
          "General Support",
        ]
      : [
          "Registration",
          "Swag Distribution",
          "Tech Support",
          "Check-in Desk",
          "Room Setup",
          "General Support",
        ];

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0));
      const end = new Date(today.setHours(23, 59, 59, 999));

      const q = query(
        collection(db, "task_checkins"),
        where("event", "==", currentEvent),
        where("checkinTime", ">=", Timestamp.fromDate(start)),
        where("checkinTime", "<=", Timestamp.fromDate(end)),
        where("status", "==", "Check In for Task")
      );

      const snapshot = await getDocs(q);
      const grouped = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const task = data.task || "Unknown";
        if (!grouped[task]) grouped[task] = [];
        grouped[task].push({ ...data, id: docSnap.id });
      });

      setTaskData(grouped);
    };

    fetchData();
  }, [currentEvent]);

  const toggleTask = (task) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTask((prev) => (prev === task ? null : task));
  };

  const calculateMinutes = (checkinTime) => {
    const start = new Date(checkinTime.seconds * 1000);
    const now = new Date();
    return Math.floor((now - start) / 60000);
  };

  const handleReassign = async () => {
    if (!selectedVolunteer || !newTask) return;

    const now = new Date();
    await updateDoc(doc(db, "task_checkins", selectedVolunteer.id), {
      checkoutTime: now.toISOString(),
    });

    await setDoc(doc(db, 'task_checkins', `${selectedVolunteer.first_name}_${selectedVolunteer.last_name}_${Date.now()}`), {
      first_name: selectedVolunteer.first_name,
      last_name: selectedVolunteer.last_name,
      task: newTask,
      role: selectedVolunteer.role,
      status: 'Check In for Task',
      checkinTime: Timestamp.now(),
      checkoutTime: null,
      teamLead: selectedVolunteer.teamLead,
      event: currentEvent,
      reassignedBy: name, // Admin name from URL param
      reassignedAt: new Date(),
    });

    setModalVisible(false);
    setNewTask("");
  };

  return (
    <ScreenWrapper event={currentEvent}>
      <Text style={[styles.title, { color: theme.text }]}>
        {currentEvent} Task Dashboard
      </Text>

      {tasks.map((task) => (
        <View key={task} style={styles.taskBlock}>
          <TouchableOpacity
            onPress={() => toggleTask(task)}
            style={[styles.taskHeader, { borderColor: theme.primary }]}
          >
            <Text style={[styles.taskTitle, { color: theme.text }]}>
              {task}
            </Text>
            <Text style={[styles.toggleText, { color: theme.primary }]}>
              {expandedTask === task ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {expandedTask === task && (
            <View style={styles.taskBody}>
              {(taskData[task] || []).map((v, idx) => (
                <View
                  key={idx}
                  style={[styles.row, { borderColor: theme.primary }]}
                >
                  <Text style={[styles.cell, { color: theme.text }]}>
                    {v.first_name} {v.last_name}
                  </Text>
                  <Text style={[styles.cell, { color: theme.text }]}>
                    Team Lead: {v.teamLead || "N/A"}
                  </Text>
                  <Text style={[styles.cell, { color: theme.text }]}>
                    Time: {calculateMinutes(v.checkinTime)} mins
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedVolunteer(v);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={{ color: theme.primary }}>Reassign</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {(taskData[task] || []).length === 0 && (
                <Text style={[styles.noData, { color: theme.text }]}>
                  No check-ins for this task
                </Text>
              )}
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/admin/home",
            params: { name, event: currentEvent },
          })
        }
        style={[styles.backButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.backText, { color: theme.primary }]}>
          ← Back to Dashboard
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reassign Task</Text>
            <Text style={styles.modalText}>
              {selectedVolunteer?.first_name} {selectedVolunteer?.last_name}
            </Text>
            <Picker
              selectedValue={newTask}
              onValueChange={(itemValue) => setNewTask(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select a new task" value="" />
              {tasks.map((task) => (
                <Picker.Item key={task} label={task} value={task} />
              ))}
            </Picker>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReassign}>
                <Text style={styles.confirmButton}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  taskBlock: {
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  toggleText: {
    fontSize: 18,
    fontWeight: "600",
  },
  taskBody: {
    marginTop: 10,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  cell: {
    fontSize: 14,
    marginBottom: 4,
  },
  noData: {
    fontSize: 14,
    fontStyle: "italic",
  },
  backButton: {
    marginTop: 24,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "center",
    borderRadius: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  cancelButton: {
    color: "#999",
    fontSize: 16,
  },
  confirmButton: {
    color: "#fe88df",
    fontSize: 16,
    fontWeight: "600",
  },
  picker: {
    backgroundColor: '#eee',
    borderRadius: 12,
    marginBottom: 20,
  },
});
