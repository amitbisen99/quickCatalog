const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    industry: { type: String, trim: true },
    logo: { type: String },
    // Header background image for the vendor's public catalog pages.
    banner: { type: String },
    // Display currency for this vendor's prices — validated against
    // CURRENCY_CODES (utils/currencies.js) at the API layer.
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: ['unverified', 'verified', 'inactive'],
      default: 'unverified',
    },
    subscriptionType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    subscriptionExpiresAt: { type: Date },

    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },

    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.setOtp = async function setOtp(otp, ttlMinutes = 10) {
  this.otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  this.otpExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
};

userSchema.methods.compareOtp = function compareOtp(candidate) {
  if (!this.otpHash || !this.otpExpiresAt) return Promise.resolve(false);
  if (this.otpExpiresAt.getTime() < Date.now()) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.otpHash);
};

userSchema.methods.setResetToken = async function setResetToken(token, ttlHours = 1) {
  this.resetPasswordTokenHash = await bcrypt.hash(token, SALT_ROUNDS);
  this.resetPasswordExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
};

userSchema.methods.compareResetToken = function compareResetToken(candidate) {
  if (!this.resetPasswordTokenHash || !this.resetPasswordExpiresAt) return Promise.resolve(false);
  if (this.resetPasswordExpiresAt.getTime() < Date.now()) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.resetPasswordTokenHash);
};

module.exports = mongoose.model('User', userSchema);
