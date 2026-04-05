const cron = require("node-cron");

const Reminder = require("../models/reminder.model");
const User = require("../models/user.model");
const { sendTelegramMessage } = require("./telegram.service");

function getDefaultIntervalMinutes() {
  const parsed = Number(process.env.REMINDER_INTERVAL_MINUTES);
  if (!Number.isFinite(parsed) || parsed < 5) {
    return 480;
  }

  return Math.floor(parsed);
}

function getResponseTimeoutMinutes() {
  const parsed = Number(process.env.REMINDER_RESPONSE_TIMEOUT_MINUTES);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 30;
  }

  return Math.floor(parsed);
}

function normalizeIntervalMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 5) {
    return getDefaultIntervalMinutes();
  }

  return Math.floor(parsed);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function buildMedicineLines(medicines) {
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  if (!safeMedicines.length) {
    return "- Follow your latest prescription.";
  }

  return safeMedicines
    .map((entry) => {
      const medicineName = String(entry?.medicineName || "Medicine").trim() || "Medicine";
      const dosage = String(entry?.dosage || "").trim();
      const instructions = String(entry?.instructions || "").trim() || "as prescribed";

      const dosagePart = dosage ? ` ${dosage}` : "";
      return `- ${medicineName}${dosagePart} -> ${instructions}`;
    })
    .join("\n");
}

function buildReminderText(reminder) {
  return [
    "Time to take your medicine. Reply DONE after taking.",
    "",
    buildMedicineLines(reminder?.medicinesSnapshot),
  ].join("\n");
}

async function upsertReminderSnapshot({ userId, chatId, medicines }) {
  const user = await User.findOne({ userId }).select("caretakerId").lean();

  await Reminder.findOneAndUpdate(
    { userId },
    {
      $set: {
        chatId,
        medicinesSnapshot: Array.isArray(medicines) ? medicines : [],
        caretakerId: String(user?.caretakerId || ""),
      },
      $setOnInsert: {
        enabled: false,
        intervalMinutes: getDefaultIntervalMinutes(),
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
}

async function enableReminder({ userId, chatId }) {
  const user = await User.findOne({ userId }).select("caretakerId").lean();
  const intervalMinutes = getDefaultIntervalMinutes();
  const now = new Date();

  const reminder = await Reminder.findOneAndUpdate(
    { userId },
    {
      $set: {
        chatId,
        caretakerId: String(user?.caretakerId || ""),
        enabled: true,
        awaitingResponse: false,
        awaitingSince: null,
        followUpCount: 0,
        nextReminderAt: addMinutes(now, intervalMinutes),
      },
      $setOnInsert: {
        intervalMinutes,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  return reminder;
}

async function markReminderDone({ userId }) {
  const reminder = await Reminder.findOne({ userId });
  if (!reminder || !reminder.enabled) {
    return false;
  }

  const now = new Date();
  const intervalMinutes = normalizeIntervalMinutes(reminder.intervalMinutes);

  reminder.awaitingResponse = false;
  reminder.awaitingSince = null;
  reminder.followUpCount = 0;
  reminder.lastDoneAt = now;
  reminder.nextReminderAt = addMinutes(now, intervalMinutes);

  await reminder.save();
  return true;
}

async function setCaretakerForUser({ userId, caretakerId }) {
  const normalizedCaretakerId = String(caretakerId || "").trim();

  await User.updateOne(
    { userId },
    {
      $set: {
        caretakerId: normalizedCaretakerId,
      },
    },
    { upsert: true }
  );

  await Reminder.updateOne(
    { userId },
    {
      $set: {
        caretakerId: normalizedCaretakerId,
      },
    }
  );
}

async function notifyCaretaker(reminder, userFallbackCaretakerId) {
  const caretakerId = String(reminder?.caretakerId || userFallbackCaretakerId || "").trim();
  if (!caretakerId) {
    return;
  }

  await sendTelegramMessage(
    caretakerId,
    `Care alert: user ${reminder.userId} did not confirm medicine intake after multiple reminders.`
  );
}

async function sendDueReminders() {
  const now = new Date();

  const dueReminders = await Reminder.find({
    enabled: true,
    awaitingResponse: false,
    nextReminderAt: { $lte: now },
  }).limit(200);

  for (const reminder of dueReminders) {
    try {
      await sendTelegramMessage(reminder.chatId, buildReminderText(reminder));
      reminder.awaitingResponse = true;
      reminder.awaitingSince = now;
      reminder.followUpCount = 0;
      reminder.lastReminderAt = now;
      await reminder.save();
    } catch (error) {
      console.error("[reminder] Failed to send due reminder:", error.message);
    }
  }

  const awaitingReminders = await Reminder.find({
    enabled: true,
    awaitingResponse: true,
  }).limit(200);

  const timeoutMs = getResponseTimeoutMinutes() * 60 * 1000;

  for (const reminder of awaitingReminders) {
    try {
      if (!reminder.awaitingSince || now.getTime() - reminder.awaitingSince.getTime() < timeoutMs) {
        continue;
      }

      if (reminder.followUpCount < 1) {
        await sendTelegramMessage(
          reminder.chatId,
          "Reminder: please reply DONE after taking your medicine."
        );

        reminder.followUpCount += 1;
        reminder.awaitingSince = now;
        reminder.lastReminderAt = now;
        await reminder.save();
        continue;
      }

      const user = await User.findOne({ userId: reminder.userId }).select("caretakerId").lean();
      await notifyCaretaker(reminder, user?.caretakerId);

      reminder.awaitingResponse = false;
      reminder.awaitingSince = null;
      reminder.followUpCount = 0;
      reminder.nextReminderAt = addMinutes(now, normalizeIntervalMinutes(reminder.intervalMinutes));
      await reminder.save();
    } catch (error) {
      console.error("[reminder] Failed to process awaiting reminder:", error.message);
    }
  }
}

let schedulerStarted = false;

function initReminderScheduler() {
  if (schedulerStarted) {
    return;
  }

  cron.schedule(
    "* * * * *",
    () => {
      sendDueReminders().catch((error) => {
        console.error("[reminder] Scheduler cycle failed:", error.message);
      });
    },
    {
      timezone: process.env.REMINDER_TIMEZONE || "UTC",
    }
  );

  schedulerStarted = true;
  console.log("[reminder] Scheduler started.");
}

module.exports = {
  enableReminder,
  markReminderDone,
  setCaretakerForUser,
  upsertReminderSnapshot,
  initReminderScheduler,
};
