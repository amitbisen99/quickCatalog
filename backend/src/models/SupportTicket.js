const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Snapshots of the vendor's identity at submission time — survive a
    // later rename/email change, same reasoning as Enquiry's catalogName
    // snapshot. This is exactly what shows up in the admin panel per the
    // request: company name + registered email alongside the message.
    companyName: { type: String, required: true },
    vendorEmail: { type: String, required: true },

    reason: { type: String, required: true, trim: true, maxlength: 500 },
    contactPersonName: { type: String, required: true, trim: true },
    contactMethod: { type: String, enum: ['email', 'mobile'], required: true },
    contactValue: { type: String, required: true, trim: true },

    status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open', index: true },
    adminReply: { type: String, trim: true },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
