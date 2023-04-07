import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  userAllUsers,
  userDetails,
  userForgotPassword,
  userForgotPasswordOtpEmail,
  userLogin,
  userLogout,
  userResendOtp,
  userSendVerificationOTPEmail,
  userSignup,
  userVerifyOTP,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/signup", userSignup);
router.post("/verification-otp-mail", userSendVerificationOTPEmail);
router.post("/verifyOtp", userVerifyOTP);
router.post("/login", userLogin);
router.get("/user", authMiddleware, userDetails);
router.post("/logout", authMiddleware, userLogout);
router.post("/resend-otp", userResendOtp);
router.post("/forgot-password-otp", userForgotPasswordOtpEmail);
router.post("/forgot-password", userForgotPassword);
router.get("/", authMiddleware, userAllUsers);

export const userRoutes = router;
