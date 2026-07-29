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
        name: process.env.BREVO_SENDER_NAME || 'QuickCatalog',
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
    subject: 'Verify your QuickCatalog account',
    htmlContent: `
      <p>Your QuickCatalog verification code is:</p>
      <h2 style="letter-spacing:4px;">${otp}</h2>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

function sendPasswordResetEmail(email, resetLink) {
  return sendEmail({
    to: email,
    subject: 'Reset your QuickCatalog password',
    htmlContent: `
      <p>We received a request to reset your QuickCatalog password.</p>
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
      <p>Log in to QuickCatalog to view the full enquiry.</p>
    `,
  });
}

module.exports = { sendEmail, sendOtpEmail, sendPasswordResetEmail, sendEnquiryNotificationEmail };
