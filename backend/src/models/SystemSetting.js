const mongoose = require('mongoose');

// Generic single-row key/value store for small pieces of server state
// that need to persist across restarts but don't warrant their own
// model. Currently just one key: 'lifecycleEmailsLaunchedAt' (see
// utils/lifecycleEmails.js) — the moment the lifecycle email feature
// first ran in this deployment, used as the "new signups only" cutoff
// so it never has to be a guessed, hardcoded date in code.
const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
