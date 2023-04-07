import { OtpVerification } from "../models/otpVerificationModel.js";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";

export const generateOtp = async (email, otpType) => {
  const newOtp = otpGenerator.generate(4, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const hashedOtp = await bcrypt.hash(newOtp, await bcrypt.genSalt(10));

  const otp = await OtpVerification.create({
    email: email,
    otp: hashedOtp,
    otpType: otpType,
  });

  if(otp){
    return {otp, newOtp};
  }
};
