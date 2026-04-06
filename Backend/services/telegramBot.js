const TelegramBot = require("node-telegram-bot-api");
const nodemailer = require("nodemailer");
const Member = require("../Model/Member");
const ReminderLog = require("../Model/ReminderLog");

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

if (token) {
  bot = new TelegramBot(token, { polling: true });

  // 1. Linking chat to member
  bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1]; // /start <memberId>

    try {
      let member = await Member.findOne({ activationCode: code });
      
      // Fallback for older members who might be using their big MongoDB ID
      if (!member && code.length === 24) {
        member = await Member.findById(code);
      }

      if (member) {
        member.telegramChatId = String(chatId);
        await member.save();
        bot.sendMessage(chatId, `✅ Successfully linked this chat to ${member.name}. You will now receive medication reminders here!`);
      } else {
        bot.sendMessage(chatId, `❌ Invalid Registration Code.`);
      }
    } catch (e) {
      console.error("Telegram /start error:", e);
      bot.sendMessage(chatId, `❌ An error occurred.`);
    }
  });

  bot.onText(/\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome to Artika.life! Please click the link on the website to link this chat to your family member.");
  });

  // 2. Listening to poll answers
  bot.on("poll_answer", async (answer) => {
    try {
      const pollId = answer.poll_id;
      const optionIds = answer.option_ids; // array of answered option indices

      // Find the log
      const log = await ReminderLog.findOne({ pollMessageId: pollId });
      if (!log) return;

      const member = await Member.findById(log.memberId);
      const Reminder = require("../Model/Reminder");
      const reminder = await Reminder.findById(log.reminderId);

      // Increment doses taken regardless of Yes or No, since the reminder event has concluded
      if (reminder) {
        reminder.dosesTaken = (reminder.dosesTaken || 0) + 1;
        await reminder.save();
      }

      // Option 0: Yes, Option 1: No
      if (optionIds.includes(0)) {
        log.status = "Yes";
        await log.save();
        
        if (member && member.telegramChatId) {
          bot.sendMessage(member.telegramChatId, "Have a nice day! 😊");
        }
      } else if (optionIds.includes(1)) {
        // Change status to Ignored so cron doesn't send duplicate
        log.status = "Ignored";
        await log.save();

        if (member && reminder && member.userEmail) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: member.userEmail, 
            subject: `🚨 Medication Alert: ${member.name}`,
            text: `Hello,\n\nThis is an automated alert from ARTIKA.life.\n\nYour family member, ${member.name}, has explicitly clicked "No" for taking the medication "${reminder.medication}" scheduled at ${log.time}.\n\nPlease check on them.\n\nBest,\nARTIKA.life Team`,
          };
          try {
            await transporter.sendMail(mailOptions);
            console.log(`Instant "No" email sent for ${member.name} to ${member.userEmail}`);
          } catch (err) {
            console.error("Instant email error:", err);
          }
        }
      }
    } catch (e) {
      console.error("Poll answer error:", e);
    }
  });

  console.log("✅ Telegram Bot initialized");
}

module.exports = bot;
