require("dotenv").config();
const mongoose = require("mongoose");
const Member = require("./Model/Member");

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    // Drop the problematic index
    await Member.collection.dropIndex("memberCode_1");
    console.log("Successfully dropped index: memberCode_1");
  } catch (error) {
    if (error.codeName === "IndexNotFound") {
      console.log("Index memberCode_1 already dropped or not found.");
    } else {
      console.error("Error dropping index:", error);
    }
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

dropIndex();
