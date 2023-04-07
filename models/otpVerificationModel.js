import mongoose from "mongoose";
import ttl from "mongoose-ttl";

const otpVerificationSchema = mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpType: {
      type: String,
      required: true,
      uppercase: true,
    },
    expireAt: {
      type: Date,
      default: Date.now() + 60000 * 5,
    },
  },
  {
    timestamps: true,
  }
);

otpVerificationSchema
  .path("expireAt")
  .index({ expireAt: 1, expires: 300, expireAfterSeconds: 300, background: false });

export const OtpVerification = mongoose.model(
  "OtpVerification",
  otpVerificationSchema
);
