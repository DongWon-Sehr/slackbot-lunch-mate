const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../participants.json");

function loadParticipants() {
  try {
    const data = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("❌ Failed to load participants:", e);
    return [];
  }
}

function saveParticipants(participants) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(participants, null, 2));
  } catch (e) {
    console.error("❌ Failed to save participants:", e);
  }
}

module.exports = {
  loadParticipants,
  saveParticipants,
};