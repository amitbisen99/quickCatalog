/** Strips sensitive/internal fields before a User doc goes in a response. */
module.exports = function toSafeUser(user) {
  return {
    id: user._id,
    email: user.email,
    mobileNo: user.mobileNo,
    businessName: user.businessName,
    businessType: user.businessType,
    industry: user.industry,
    logo: user.logo,
    banner: user.banner,
    currency: user.currency,
    subscriptionType: user.subscriptionType,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    status: user.status,
    createdAt: user.createdAt,
  };
};
