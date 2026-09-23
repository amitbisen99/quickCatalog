// Adds a freshly-verified vendor to a Brevo marketing list — separate from
// email.service.js's transactional sends (OTP, welcome, lifecycle emails),
// though it reuses the same Brevo account/API key. See
// backend/.env.example's BREVO_REGISTRATION_LIST_ID for the attributes this
// needs pre-created in Brevo (Contacts → Settings → Contact Attributes).

const BREVO_CONTACTS_API_URL = 'https://api.brevo.com/v3/contacts';

/**
 * Best-effort: never throws. Call sites treat this the same way
 * sendWelcomeEmail already is — registration having already succeeded, a
 * Brevo hiccup here shouldn't turn into a 500 or block the vendor.
 */
async function syncVendorToBrevoList(user) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_REGISTRATION_LIST_ID);

  if (!apiKey || !listId) {
    console.log('[DEV BREVO] BREVO_API_KEY or BREVO_REGISTRATION_LIST_ID not set — skipping contact sync.');
    return { synced: false, reason: 'not-configured' };
  }

  try {
    const response = await fetch(BREVO_CONTACTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: user.email,
        listIds: [listId],
        // Updates the contact (and re-adds the list) instead of erroring if
        // this email already exists in Brevo — a vendor could in principle
        // trigger this twice (see auth.controller.js's verifyEmail comment).
        updateEnabled: true,
        attributes: {
          // SMS is Brevo's own reserved attribute for a contact's phone
          // number — expects E.164 (country code + digits, no separators),
          // which is exactly countryCode + mobileNo concatenated (see
          // User.js's mobileNo/countryCode comment).
          SMS: `${user.countryCode || ''}${user.mobileNo || ''}`,
          BUSINESS_NAME: user.businessName || '',
          PLAN: user.subscriptionType === 'paid' ? 'Paid' : 'Free',
        },
      }),
    });

    // Brevo returns 201 (new contact) or 204 (existing contact updated) —
    // both are success.
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Brevo contact sync failed (${response.status}): ${errorBody}`);
      return { synced: false, reason: 'brevo-error' };
    }

    return { synced: true };
  } catch (err) {
    console.error('Brevo contact sync failed:', err);
    return { synced: false, reason: 'network-error' };
  }
}

module.exports = { syncVendorToBrevoList };
