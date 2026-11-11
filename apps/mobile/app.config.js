// Extends app.json. Firebase (FCM push) is optional: put google-services.json from
// the Firebase console next to this file to enable it; without it the app builds
// normally and only local reminders work.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  if (!fs.existsSync(path.join(__dirname, "google-services.json"))) return config;
  return { ...config, android: { ...config.android, googleServicesFile: "./google-services.json" } };
};
