import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import AvailabilityForm from "../../components/AvailabilityForm"; // Assuming the form component lives here

export default function VolunteerShiftView() {
  const { event, name, uid } = useLocalSearchParams();
  const router = useRouter();

  const [availableShifts, setAvailableShifts] = useState([]);
  const [myShifts, setMyShifts] = useState([]);
  const [showAvailable, setShowAvailable] = useState(false);
  const [manualScheduling, setManualScheduling] = useState(true);
  const [availability, setAvailability] = useState({});
  const [eventStartDate, setEventStartDate] = useState(null);
  const [hasRequestedChange, setHasRequestedChange] = useState(false);

  const currentUser = {
    uid,
    first_name: name?.split(" ")[0],
    last_name: name?.split(" ")[1] || "",
  };

  useEffect(() => {
    const fetchSchedulingMode = async () => {
      const eventDoc = await getDoc(doc(db, "events", event));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        setManualScheduling(eventData.manual_scheduling ?? true);
      }
    };

    fetchSchedulingMode();
  }, [event]);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const q = query(collection(db, "shifts"), where("event", "==", event));
        const snapshot = await getDocs(q);

        const allShifts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const mine = allShifts.filter((shift) =>
          shift.claimed_by.some((v) => v.uid === currentUser.uid)
        );

        const available = allShifts.filter(
          (shift) =>
            shift.claimed_by.length <
              shift.max_signups + shift.overage_buffer &&
            !shift.claimed_by.some((v) => v.uid === currentUser.uid)
        );

        setMyShifts(mine);
        setAvailableShifts(available);
      } catch (error) {
        console.error("Error fetching shifts:", error);
      }
    };

    fetchShifts();
  }, [event, currentUser]);

  const handleClaim = async (shift) => {
    console.log("UID", currentUser.uid);
    console.log(currentUser, "currentUser");
    try {
      const shiftRef = doc(db, "shifts", shift.id);
      const updatedClaimed = Array.isArray(shift.claimed_by)
        ? [
            ...shift.claimed_by,
            {
              uid: uid,
              first_name: currentUser.first_name,
              last_name: currentUser.last_name,
              role: "volunteer",
            },
          ]
        : [
            {
              uid: uid,
              first_name: currentUser.first_name,
              last_name: currentUser.last_name,
              role: "volunteer",
            },
          ];

      await updateDoc(shiftRef, { claimed_by: updatedClaimed });

      Alert.alert("Success", "You’ve claimed this shift.");
    } catch (err) {
      console.error("Error claiming shift:", err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const handleJoinWaitlist = async (shift) => {
    try {
      const waitlistRef = collection(db, "waitlist");

      await addDoc(waitlistRef, {
        shift_id: shift.id,
        event,
        uid: currentUser.uid,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        timestamp: new Date().toISOString(),
      });

      Alert.alert("Waitlist", "You've been added to the waitlist.");
    } catch (err) {
      console.error("Error joining waitlist:", err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const isScheduleLocked = () => {
    if (!eventStartDate) return false;
    const daysLeft = differenceInDays(eventStartDate, new Date());
    return hasRequestedChange || daysLeft < 7;
  };

  const renderShiftItem = ({ item }) => {
    const isFull =
      item.claimed_by.length >= item.max_signups + item.overage_buffer;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          {item.date} | {item.start_time}–{item.end_time}
        </Text>
        <Text>{item.floor}</Text>
        <Text>{item.role}</Text>

        {!isFull ? (
          <TouchableOpacity
            onPress={() => handleClaim(item)}
            style={styles.claimButton}
          >
            <Text style={styles.claimText}>Claim Shift</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => handleJoinWaitlist(item)}
            style={[styles.claimButton, { backgroundColor: "#ccc" }]}
          >
            <Text style={[styles.claimText, { color: "#711B44" }]}>
              Join Waitlist
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderMyShiftItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>
        {item.date} | {item.start_time}–{item.end_time}{" "}
        {isScheduleLocked() && " 🔒"}
      </Text>
      <Text>{item.floor}</Text>
      <Text>{item.role}</Text>
    </View>
  );

  const handleAvailabilityChange = (day, shift) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [shift]: !prev[day]?.[shift],
      },
    }));
  };

  const handleAvailabilitySubmit = async () => {
    const payload = [];
    for (const [day, shiftsObj] of Object.entries(availability)) {
      for (const [shift, isAvailable] of Object.entries(shiftsObj)) {
        if (isAvailable) {
          payload.push({ day, shift });
        }
      }
    }

    try {
      const availabilityCollection = collection(db, "availability");
      for (const entry of payload) {
        await addDoc(availabilityCollection, {
          event,
          uid,
          name,
          ...entry,
          timestamp: new Date().toISOString(),
        });
      }

      Alert.alert("Success", "Availability submitted.");
      setAvailability({});
    } catch (err) {
      console.error("Error submitting availability:", err);
      Alert.alert("Error submitting availability.");
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      {manualScheduling ? (
        !showAvailable ? (
          <>
            <Text style={styles.sectionHeader}>My Shifts</Text>
            <FlatList
              data={myShifts}
              keyExtractor={(item) => `mine-${item.id}`}
              renderItem={renderMyShiftItem}
              ListEmptyComponent={<Text>No claimed shifts yet.</Text>}
            />
            {!isScheduleLocked() && (
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={() =>
                  router.push({
                    pathname: "/volunteer/RequestChangeForm",
                    params: { event, uid },
                  })
                }
              >
                <Text style={styles.claimText}>Request Change</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => setShowAvailable(true)}
            >
              <Text style={styles.claimText}>Add More Shifts</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Available Shifts</Text>
            <FlatList
              data={availableShifts}
              keyExtractor={(item) => `available-${item.id}`}
              renderItem={renderShiftItem}
              ListEmptyComponent={<Text>No available shifts.</Text>}
            />
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowAvailable(false)}
            >
              <Text style={styles.backText}>← Back to My Shifts</Text>
            </TouchableOpacity>
          </>
        )
      ) : (
        <AvailabilityForm event={event} name={name} uid={uid} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
  },
  claimButton: {
    marginTop: 10,
    backgroundColor: "#fe88df",
    padding: 10,
    borderRadius: 8,
  },
  claimText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  addMoreButton: {
    marginTop: 16,
    backgroundColor: "#fe88df",
    padding: 12,
    borderRadius: 10,
  },
  backButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  backText: {
    color: "#711B44",
    fontWeight: "600",
    fontSize: 16,
  },
});
