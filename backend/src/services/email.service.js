const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends via Brevo's transactional email API. If BREVO_API_KEY isn't
 * configured (not set up yet for local dev), logs the email to the
 * console instead of failing the whole request — lets auth flows be
 * exercised end-to-end without a Brevo account.
 */
async function sendEmail({ to, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log('\n[DEV EMAIL] BREVO_API_KEY not set — logging instead of sending.');
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`[DEV EMAIL] ${htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`);
    return { sent: false, reason: 'no-api-key' };
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Instant Catalog',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Brevo send failed (${response.status}): ${errorBody}`);
    return { sent: false, reason: 'brevo-error' };
  }

  return { sent: true };
}

function sendOtpEmail(email, otp) {
  return sendEmail({
    to: email,
    subject: 'Verify your Instant Catalog account',
    htmlContent: `
      <p>Your Instant Catalog verification code is:</p>
      <h2 style="letter-spacing:4px;">${otp}</h2>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

function sendPasswordResetEmail(email, resetLink) {
  return sendEmail({
    to: email,
    subject: 'Reset your Instant Catalog password',
    htmlContent: `
      <p>We received a request to reset your Instant Catalog password.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

function sendEnquiryNotificationEmail(vendorEmail, enquiry) {
  const itemsHtml = enquiry.items
    .map((item) => `<li>${item.name} — Qty ${item.quantity} (₹${item.price}/${item.unit || 'pcs'})</li>`)
    .join('');

  return sendEmail({
    to: vendorEmail,
    subject: `New enquiry on "${enquiry.catalogName}"`,
    htmlContent: `
      <p>You've received a new enquiry on your catalog <strong>${enquiry.catalogName}</strong>.</p>
      <p><strong>${enquiry.customerName}</strong><br/>
      Mobile: ${enquiry.customerMobile}${enquiry.customerEmail ? `<br/>Email: ${enquiry.customerEmail}` : ''}</p>
      <p>Products:</p>
      <ul>${itemsHtml}</ul>
      <p>Log in to Instant Catalog to view the full enquiry.</p>
    `,
  });
}

function sendSupportTicketNotificationEmail(adminEmail, ticket) {
  const contactLine = ticket.contactMethod === 'email' ? `Email: ${ticket.contactValue}` : `Mobile: ${ticket.contactValue}`;

  return sendEmail({
    to: adminEmail,
    subject: `New support request from ${ticket.companyName}`,
    htmlContent: `
      <p>A new support request has come in from <strong>${ticket.companyName}</strong> (${ticket.vendorEmail}).</p>
      <p><strong>Contact person:</strong> ${ticket.contactPersonName}<br/>
      <strong>Preferred contact:</strong> ${contactLine}</p>
      <p><strong>Reason for contact:</strong></p>
      <p>${ticket.reason}</p>
      <p>Log in to the Instant Catalog admin panel to respond.</p>
    `,
  });
}

function sendSupportTicketReplyEmail(vendorEmail, ticket) {
  return sendEmail({
    to: vendorEmail,
    subject: 'Reply to your Instant Catalog support request',
    htmlContent: `
      <p>Our support team replied to your request:</p>
      <p style="color:#666;">"${ticket.reason}"</p>
      <p><strong>Reply:</strong></p>
      <p>${ticket.adminReply}</p>
    `,
  });
}

// Sent once, right after OTP verification actually completes the
// registration — separate from sendOtpEmail, which only confirms the
// vendor owns the address, not that they've finished signing up.
function sendWelcomeEmail(email, businessName) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Instant Catalog 🎉',
    htmlContent: `
      <p>Hi ${businessName || 'there'},</p>
      <p>Your Instant Catalog account is verified and ready to go.</p>
      <p>Log in to your dashboard to build your first catalog, add products, and start sharing a link with your customers.</p>
      <p><a href="${process.env.CLIENT_URL}/login">Log in to Instant Catalog</a></p>
    `,
  });
}

// amount is in the smallest currency unit (paise/cents), same as
// Payment.amount and what Razorpay itself deals in — see the model.
function sendPaymentSuccessEmail(email, { amount, currency }) {
  const majorAmount = (amount / 100).toFixed(2);
  return sendEmail({
    to: email,
    subject: "Payment received — you're on the Instant Catalog Paid plan",
    htmlContent: `
      <p>Thanks for upgrading!</p>
      <p>We've received your payment of ${currency} ${majorAmount} and your account is now on the <strong>Paid plan</strong> — unlimited catalogs and products, plus custom domain support.</p>
      <p><a href="${process.env.CLIENT_URL}/dashboard/settings">View your subscription</a></p>
    `,
  });
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendEnquiryNotificationEmail,
  sendSupportTicketNotificationEmail,
  sendSupportTicketReplyEmail,
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
};
