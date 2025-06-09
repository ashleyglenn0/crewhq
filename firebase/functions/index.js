const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

// 🔁 Every 5 mins: Check task coverage and send alerts
exports.checkCoverage = onSchedule("every 5 minutes", async (event) => {
  const today = new Date().toISOString().split('T')[0];
  const eventName = 'RenderATL';

  try {
    const schedSnap = await db
      .collection('scheduled_volunteers')
      .where('event', '==', eventName)
      .where('date', '==', today)
      .get();

    const checkInSnap = await db
      .collection('check_ins')
      .where('event', '==', eventName)
      .where('status', '==', 'Checked In')
      .get();

    const schedule = {};
    const checkIns = {};

    schedSnap.forEach((doc) => {
      const { task } = doc.data();
      if (!task) return;
      schedule[task] = (schedule[task] || 0) + 1;
    });

    checkInSnap.forEach((doc) => {
      const { task } = doc.data();
      if (!task) return;
      checkIns[task] = (checkIns[task] || 0) + 1;
    });

    for (const task in schedule) {
      const total = schedule[task];
      const present = checkIns[task] || 0;
      const coverage = present / total;

      if (coverage < 0.5 && total >= 2) {
        const message = `⚠️ Coverage low on ${task}: ${present}/${total} checked in.`;

        await db.collection('alerts').add({
          message,
          severity: 'error',
          event: eventName,
          audience: 'teamlead-direct',
          taskGroup: [task],
          sendPush: true,
          sent: false,
          dismissedBy: [],
          createdAt: admin.firestore.Timestamp.now(),
        });

        await db.collection('alerts').add({
          message,
          severity: 'error',
          event: eventName,
          audience: 'admin-all',
          sendPush: true,
          sent: false,
          dismissedBy: [],
          createdAt: admin.firestore.Timestamp.now(),
        });

        logger.info(`🚨 Coverage alert sent for ${task}: ${present}/${total}`);
      }
    }
  } catch (error) {
    logger.error("❌ Failed to check coverage:", error);
  }
});

// 📬 Every 1 min: Send push notifications for unsent alerts
exports.sendPushNotifications = onSchedule("every 1 minutes", async () => {
  const alertsSnap = await db
    .collection("alerts")
    .where("sendPush", "==", true)
    .where("sent", "==", false)
    .get();

  if (alertsSnap.empty) return null;

  for (const doc of alertsSnap.docs) {
    const alert = doc.data();
    const alertId = doc.id;

    let targets = [];

    if (alert.audience === "everyone") {
      const snap = await db.collection("push_tokens")
        .where("event", "==", alert.event).get();
      targets = snap.docs;
    } else if (alert.audience === "admin-all") {
      const snap = await db.collection("push_tokens")
        .where("role", "==", "admin")
        .where("event", "==", alert.event).get();
      targets = snap.docs;
    } else if (alert.audience === "teamlead-direct") {
      const snap = await db.collection("push_tokens")
        .where("role", "==", "teamlead")
        .where("event", "==", alert.event).get();

      targets = snap.docs.filter(doc =>
        alert.taskGroup?.includes(doc.data().task)
      );
    }

    if (targets.length === 0) {
      console.log(`❗ No push targets found for alert: ${alertId}`);
      continue;
    }

    const messages = targets.map((t) => ({
      to: t.data().token,
      sound: "default",
      title: "🚨 Urgent Alert",
      body: alert.message,
    }));

    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const json = await res.json();
      console.log(`📬 Sent push to ${messages.length} devices`, json);

      await db.collection("alerts").doc(alertId).update({ sent: true });

    } catch (err) {
      console.error("❌ Failed to send push:", err);
    }
  }

  return null;
});

// ✅ Every 5 min: Auto-resolve help requests that were picked up but never marked resolved
exports.autoResolveStaleHelpRequests = onSchedule("every 5 minutes", async () => {
  const now = Date.now();

  try {
    const snapshot = await db
      .collection("help_requests")
      .where("resolved", "==", false)
      .where("pickedUpBy", "!=", null)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    let resolvedCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const pickedUpAt = data.pickedUpAt?.toDate();

      if (!pickedUpAt) return;

      const ageInMinutes = (now - pickedUpAt.getTime()) / (1000 * 60);

      if (ageInMinutes >= 10) {
        batch.update(doc.ref, {
          resolved: true,
          autoResolved: true,
          resolvedAt: admin.firestore.Timestamp.now(),
        });
        resolvedCount++;
      }
    });

    if (resolvedCount > 0) {
      await batch.commit();
      logger.info(`✅ Auto-resolved ${resolvedCount} stale help requests.`);
    }
  } catch (err) {
    logger.error("❌ Failed to auto-resolve help requests:", err);
  }
});
