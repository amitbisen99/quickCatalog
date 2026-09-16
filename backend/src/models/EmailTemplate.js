const mongoose = require('mongoose');

// One document per lifecycle-email slot (see utils/lifecycleEmails.js's
// SEQUENCE_DEFS for the full list) — subject/body authored by the admin
// from /admin/email-templates rather than hardcoded here, per explicit
// request. Seeded automatically at server startup (seedEmailTemplates)
// with empty subject/body; the send job skips a slot entirely (not just
// this send — every future check too) until an admin fills both in.
const emailTemplateSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    // Human-readable name + which funnel stage it belongs to, purely for
    // the admin list UI — never used in the sent email itself.
    label: { type: String, required: true },
    group: { type: String, required: true },
    subject: { type: String, default: '', trim: true },
    // HTML — merge fields like {{businessName}} resolved at send time,
    // see utils/lifecycleEmails.js's renderTemplate.
    body: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
