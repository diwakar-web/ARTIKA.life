const cron = require("node-cron");
const Reminder = require("../Model/Reminder");
const ReminderLog = require("../Model/ReminderLog");
const Member = require("../Model/Member");
const nodemailer = require("nodemailer");
const bot = require("./telegramBot");

// Setup Nodemailer transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getCurrentTimeStr() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getCurrentDateStr() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

// 1. Cron to check and send Polls (runs every minute)
cron.schedule("* * * * *", async () => {
  try {
    const currentTime = getCurrentTimeStr();
    const currentDate = getCurrentDateStr();

    // Find all reminders that have current time in their times array
    const reminders = await Reminder.find({ times: currentTime }).populate("memberId");

    for (const reminder of reminders) {
      if (!reminder.memberId || !reminder.memberId.telegramChatId) continue;

      const member = reminder.memberId;

      // Check if we already sent a poll for today
      const existingLog = await ReminderLog.findOne({
        reminderId: reminder._id,
        date: currentDate,
        time: currentTime,
      });

      if (!existingLog) {
        // Send Telegram Poll and a standard message
        if (bot) {
          bot.sendMessage(member.telegramChatId, `🔔 Reminder: Time to take your medication!`);

          const pollOptions = ["Yes, I have taken it", "No, not yet"];
          const msg = await bot.sendPoll(member.telegramChatId, `Have you taken ${reminder.medication} medication?`, pollOptions, {
            is_anonymous: false
          });

          // Create Log
          await ReminderLog.create({
            reminderId: reminder._id,
            memberId: member._id,
            date: currentDate,
            time: currentTime,
            pollMessageId: msg.poll.id,
            status: "Sent"
          });
        }
      }
    }
  } catch (err) {
    console.error("Error generating polls:", err);
  }
});

// 2. Cron to check for missed/ignored polls (runs every minute)
// Check polls generated 15+ minutes ago that are still "Sent" or marked as "No".
cron.schedule("* * * * *", async () => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find logs that were created before fifteenMinsAgo and are either Sent or No
    const logs = await ReminderLog.find({
      $or: [{ status: "Sent" }, { status: "No" }],
      createdAt: { $lte: fifteenMinsAgo }
    }).populate("memberId").populate("reminderId");

    for (const log of logs) {
      const member = log.memberId;
      const reminder = log.reminderId;

      if (!member || !reminder) continue;

      // Send Email to the user that registered them
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: member.userEmail,
        subject: `🚨 Medication Missed: ${member.name}`,
        text: `Hello,\n\nThis is an automated alert from ARTIKA.life.\n\nYour family member, ${member.name}, has not taken the medication "${reminder.medication}" scheduled at ${log.time}.\n\nPlease ensure they take their medication.\n\nBest,\nARTIKA.life Team`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Missed medication email sent for ${member.name} to ${member.userEmail}`);

        // Mark as ignored/resolved so we don't spam them every minute
        log.status = "Ignored";
        await log.save();

        if (reminder) {
          reminder.dosesTaken = (reminder.dosesTaken || 0) + 1;
          await reminder.save();
        }
      } catch (e) {
        console.error("Email send error:", e);
      }
    }
  } catch (err) {
    console.error("Error checking missed polls:", err);
  }
});

console.log("✅ Reminder Cron Jobs initialized");
