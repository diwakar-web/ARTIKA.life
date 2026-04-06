const mongoose = require("mongoose");
const Member = require("../Model/Member");
const Reminder = require("../Model/Reminder");
const { uploadFile, deleteFile } = require("../Utils/cloudinary");

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER CONTROLLERS
//  Each function maps to one REST endpoint.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Add a new family member
 * @route   POST /api/members
 * @access  Public (add auth middleware later)
 */
const addMember = async (req, res) => {
  try {
    const {
      userEmail,
      name,
      relation,
      dob,
      age,
      sex,
      category,
      phoneCountryCode,
      phoneNumber,
      address,
    } = req.body;

    const safeParse = (str, fallback) => {
      try { return typeof str === "string" ? JSON.parse(str) : (str || fallback); }
      catch (e) { return fallback; }
    };

    let growthData = safeParse(req.body.growthData, null);
    let vaccinations = safeParse(req.body.vaccinations, []);
    let healthLocker = safeParse(req.body.healthLocker, []);

    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail is required" });
    }

    let photoLink = "";

    // ── Handle Cloudinary Photo Upload ───────────────────────────
    if (req.file) {
      // Structure: userEmail / MemberName / ProfilePhotos
      // Trim name to avoid folder naming issues
      const folderPath = `${userEmail.toLowerCase().trim()}/${name.trim()}/ProfilePhotos`;
      photoLink = await uploadFile(req.file, folderPath);
    }

    const uniqueCode = "art" + Math.floor(100 + Math.random() * 900);

    // Build the member document
    const newMember = new Member({
      userEmail: userEmail.toLowerCase().trim(),
      name,
      relation,
      dob,
      activationCode: uniqueCode,
      age,
      sex,
      category,
      phoneCountryCode,
      phoneNumber,
      address,
      photoLink: photoLink || req.body.photoLink || "", // Prefer uploaded file link
      growthData: ["Kid", "Newborn"].includes(category) ? growthData : null,
      vaccinations: category === "Newborn" ? vaccinations : [],
      healthLocker: healthLocker || [],
    });

    const saved = await newMember.save();
    res.status(201).json({ success: true, message: "Member added successfully", data: saved });
  } catch (error) {
    console.error("Add Member Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all family members
 * @route   GET /api/members
 * @access  Public
 */
const getAllMembers = async (req, res) => {
  try {
    const { userEmail } = req.query;  // GET /api/members?userEmail=xxx@gmail.com
    if (!userEmail) {
      return res.status(400).json({ success: false, message: "userEmail query param is required" });
    }
    const members = await Member.find({ userEmail: userEmail.toLowerCase().trim() }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single member by MongoDB _id
 * @route   GET /api/members/:id
 * @access  Public
 */
const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a member's details
 * @route   PUT /api/members/:id
 * @access  Public
 */
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, category, name } = req.body;

    console.log(`Updating member ${id} for user ${userEmail}`);

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const safeParse = (str, fallback) => {
      try { return typeof str === "string" ? JSON.parse(str) : (str || fallback); }
      catch (e) { return fallback; }
    };

    // Prepare update object with only valid fields
    const updateData = {};
    const allowedFields = [
      "name", "relation", "dob", "age", "sex", "category",
      "phoneCountryCode", "phoneNumber", "address"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (!member.activationCode) {
      updateData.activationCode = "art" + Math.floor(100 + Math.random() * 900);
    }

    // Handle nested fields
    if (req.body.growthData !== undefined) updateData.growthData = safeParse(req.body.growthData, null);
    if (req.body.vaccinations !== undefined) updateData.vaccinations = safeParse(req.body.vaccinations, []);
    if (req.body.healthLocker !== undefined) updateData.healthLocker = safeParse(req.body.healthLocker, []);

    // Enforce category-specific rules on update too
    const finalCategory = updateData.category || member.category;
    if (finalCategory && !["Kid", "Newborn"].includes(finalCategory)) {
      updateData.growthData = null;
    }
    if (finalCategory && finalCategory !== "Newborn") {
      updateData.vaccinations = [];
    }

    // Ensure numeric types
    if (updateData.age !== undefined) updateData.age = parseInt(updateData.age);

    // ── Handle Cloudinary Photo Upload (Update) ──────────────────
    if (req.file) {
      const email = userEmail || member.userEmail;
      const mName = name || member.name;
      const folderPath = `${email.toLowerCase().trim()}/${mName.trim()}/ProfilePhotos`;
      
      // Delete old photo if it exists
      if (member.photoLink) {
        await deleteFile(member.photoLink);
      }
      
      updateData.photoLink = await uploadFile(req.file, folderPath);
    }

    // Only allow updating your own members if userEmail is provided
    const filter = userEmail
      ? { _id: id, userEmail: userEmail.toLowerCase().trim() }
      : { _id: id };

    console.log("Update Data:", JSON.stringify(updateData, null, 2));

    const updated = await Member.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      console.warn(`Update failed for member ${id}: Access denied or record deleted`);
      return res.status(404).json({ success: false, message: "Access denied or record deleted" });
    }

    console.log(`Member ${id} updated successfully`);
    res.status(200).json({ success: true, message: "Member updated successfully", data: updated });
  } catch (error) {
    console.error("Update Member Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a member
 * @route   DELETE /api/members/:id
 * @access  Public
 */
const deleteMember = async (req, res) => {
  try {
    const { userEmail } = req.query;  // DELETE /api/members/:id?userEmail=xxx
    const filter = userEmail
      ? { _id: req.params.id, userEmail: userEmail.toLowerCase().trim() }
      : { _id: req.params.id };

    const deleted = await Member.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Member not found or access denied" });
    }

    // ── Cleanup Cloudinary Assets ───────────────────────────────
    // 1. Delete Profile Photo
    if (deleted.photoLink) {
      await deleteFile(deleted.photoLink);
    }

    // 2. Delete All Health Locker Documents
    if (deleted.healthLocker && deleted.healthLocker.length > 0) {
      for (const doc of deleted.healthLocker) {
        await deleteFile(doc.link);
      }
    }

    // 3. Delete All Associated Medication Reminders
    await Reminder.deleteMany({ memberId: req.params.id });

    res.status(200).json({ success: true, message: "Member and all associated files/reminders deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Health Locker Sub-Routes ───────────────────────────────────────────────

/**
 * @desc    Add a document link to a member's Health Locker
 * @route   POST /api/members/:id/health-locker
 * @body    { name, link, type }  ← Google Drive shareable link
 * @access  Public
 */
const addHealthLockerDoc = async (req, res) => {
  try {
    const { name, type } = req.body; // type: prescription | lab | insurance

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    // Systematic folder structure: userEmail / MemberName / CategoryName
    const typeMapping = {
      prescription: "Prescriptions",
      lab: "LabReports",
      insurance: "InsuranceDocs",
    };
    const folderName = typeMapping[type] || "Miscellaneous";
    const folderPath = `${member.userEmail.toLowerCase().trim()}/${member.name.trim()}/${folderName}`;

    // Upload to Database
    const fileLink = await uploadFile(req.file, folderPath);

    // Save to Mongo (Relative-like structure, we store the Drive link)
    member.healthLocker.push({
      name: name || req.file.originalname,
      link: fileLink,
      type,
    });

    await member.save();

    res.status(200).json({ success: true, message: "Document uploaded to Database", data: member.healthLocker });
  } catch (error) {
    console.error("Health Locker Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove a document from a member's Health Locker by index
 * @route   DELETE /api/members/:id/health-locker/:docIndex
 * @access  Public
 */
const removeHealthLockerDoc = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const docIdOrIndex = req.params.docIndex;
    let index = -1;

    // Check if docIdOrIndex is a valid Mongo ID
    if (mongoose.Types.ObjectId.isValid(docIdOrIndex)) {
      index = member.healthLocker.findIndex(d => d._id && d._id.toString() === docIdOrIndex);
    } else {
      index = parseInt(docIdOrIndex);
    }

    if (index === -1 || index >= member.healthLocker.length) {
      return res.status(400).json({ success: false, message: "Invalid document identifier" });
    }

    const docToDelete = member.healthLocker[index];
    if (docToDelete && docToDelete.link) {
      await deleteFile(docToDelete.link);
    }

    member.healthLocker.splice(index, 1);
    await member.save();

    res.status(200).json({ success: true, message: "Document removed from Database and Health Locker", data: member.healthLocker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Vaccination Tracker Sub-Routes (Newborn only) ─────────────────────────

/**
 * @desc    Update vaccine status for a member (Newborn)
 * @route   PUT /api/members/:id/vaccines/:vaccineIndex
 * @body    { status: "Done" | "Scheduled" | "Not Done" }
 * @access  Public
 */
const updateVaccineStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (member.category !== "Newborn") {
      return res.status(400).json({ success: false, message: "Vaccination tracking is only for Newborns" });
    }

    const index = parseInt(req.params.vaccineIndex);
    if (index < 0 || index >= member.vaccinations.length) {
      return res.status(400).json({ success: false, message: "Invalid vaccine index" });
    }

    member.vaccinations[index].status = req.body.status;
    member.vaccinations[index].isDone = req.body.status === "Done";
    await member.save();

    res.status(200).json({ success: true, message: "Vaccine status updated", data: member.vaccinations });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  addMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  addHealthLockerDoc,
  removeHealthLockerDoc,
  updateVaccineStatus,
};
