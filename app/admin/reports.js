import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { db } from '../../firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';

const themes = {
  RenderATL: {
    background: '#fdf0e2',
    primary: '#fe88df',
    text: '#711b43',
  },
  ATW: {
    background: '#f5f5f5',
    primary: '#ffb89e',
    text: '#4f2b91',
  },
};

const tabLabels = {
  checkins: 'Check-Ins',
  checkouts: 'Check-Outs',
  noshows: 'No-Shows',
};

export default function ReportsScreen() {
  const { event, name } = useLocalSearchParams();
  const router = useRouter();

  const [currentEvent, setCurrentEvent] = useState(event || 'RenderATL');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'checkins', title: 'Check-Ins' },
    { key: 'checkouts', title: 'Check-Outs' },
    { key: 'noshows', title: 'No-Shows' },
  ]);

  const [checkIns, setCheckIns] = useState([]);
  const [checkOuts, setCheckOuts] = useState([]);
  const [noShows, setNoShows] = useState([]);

  const theme = themes[currentEvent] || themes.RenderATL;

  useEffect(() => {
    const fetchData = async () => {
      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0, 0, 0, 0
      );
      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23, 59, 59, 999
      );
      const start = Timestamp.fromDate(startOfDay);
      const end = Timestamp.fromDate(endOfDay);

      const [ciSnap, coSnap, schedSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'check_ins'),
          where('event', '==', currentEvent),
          where('status', '==', 'Checked In'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end)
        )),
        getDocs(query(
          collection(db, 'check_ins'),
          where('event', '==', currentEvent),
          where('status', '==', 'Checked Out'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end)
        )),
        getDocs(query(
          collection(db, 'scheduled_volunteers'),
          where('event', '==', currentEvent),
          where('date', '==', selectedDate.toISOString().split('T')[0])
        )),
      ]);

      const ciData = ciSnap.docs.map((doc) => doc.data());
      const coData = coSnap.docs.map((doc) => doc.data());
      const schedData = schedSnap.docs.map((doc) => doc.data());

      const noShowData = schedData.filter(
        (v) =>
          !ciData.some(
            (ci) =>
              ci.first_name === v.first_name &&
              ci.last_name === v.last_name
          )
      );

      setCheckIns(ciData);
      setCheckOuts(coData);
      setNoShows(noShowData);
    };

    fetchData();
  }, [selectedDate, currentEvent]);

  const handleExport = async (type) => {
    const dataMap = {
      checkins: checkIns,
      checkouts: checkOuts,
      noshows: noShows,
    };
    const rows = [
      ['First Name', 'Last Name', 'Status', 'Date'],
      ...dataMap[type].map((v) => [
        v.first_name,
        v.last_name,
        v.status || (type === 'noshows' ? 'No Show' : ''),
        v.timestamp?.toDate?.().toLocaleString?.() || v.date || 'N/A',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const fileUri = FileSystem.documentDirectory +
      `${type}-${selectedDate.toISOString().split('T')[0]}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri);
  };

  const renderTab = (data) => (
    <FlatList
      data={data}
      keyExtractor={(_, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: theme.primary }]}>
          <Text style={[styles.cell, { color: theme.text }]}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={[styles.cell, { color: theme.text }]}>
            {item.status || 'No Show'}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', color: theme.text, marginTop: 24 }}>
          No data available.
        </Text>
      }
    />
  );

  const renderScene = SceneMap({
    checkins: () => renderTab(checkIns),
    checkouts: () => renderTab(checkOuts),
    noshows: () => renderTab(noShows),
  });

  return (
    <ScreenWrapper event={currentEvent} scroll={false}>
      <Text style={[styles.title, { color: theme.text }]}>
        {currentEvent} Reports
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() =>
            setCurrentEvent(currentEvent === 'RenderATL' ? 'ATW' : 'RenderATL')
          }
          style={[styles.switchButton, { borderColor: theme.primary }]}
        >
          <Text style={{ color: theme.primary }}>
            Switch to {currentEvent === 'RenderATL' ? 'ATW' : 'RenderATL'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.dateButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.dateButtonText}>Change Date</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <View style={{ alignSelf: 'center', marginBottom: 20 }}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        </View>
      )}

      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: theme.primary }}
            style={{ backgroundColor: theme.background }}
            labelStyle={{ fontWeight: 'bold' }}
            activeColor={theme.text}
            inactiveColor={theme.text}
          />
        )}
      />

      <TouchableOpacity
        onPress={() => handleExport(routes[tabIndex].key)}
        style={[styles.exportButton, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.exportText}>
          📤 Export {tabLabels[routes[tabIndex].key]}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: '/admin/home', params: { name, event: currentEvent } })
        }
        style={[styles.backButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.backText, { color: theme.primary }]}>
          ← Back to Dashboard
        </Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  switchButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 20,
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  dateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  cell: {
    fontSize: 16,
    marginBottom: 4,
  },
  exportButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  exportText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 24,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    borderRadius: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
