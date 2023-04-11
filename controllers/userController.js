import { User } from "../models/userModel.js";
import { generateToken } from "../config/generateToken.js";
import bcrypt from "bcrypt";
import { OtpVerification } from "../models/otpVerificationModel.js";
import { sendMail } from "../config/sendMail.js";
import { generateOtp } from "../config/generateOTP.js";

export const userSignup = async (req, res) => {
  try {
    const { name, email, password, pic } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Enter all the required fields");
    }

    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

    if (!password.match(passwordRegex)) {
      res.status(400);
      throw new Error(
        "Password must contain atleast 8 characters with one uppercase letter, one lowercase letter, one numeric digit, one special character"
      );
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("User already exists with this email");
    }

    const user = await User.create({
      name,
      email,
      password,
      pic,
    });

    res.status(200).send({
      isSuccess: true,
      message: "Registration completed successfully. Kindly verify the email.",
    });
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userSendVerificationOTPEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      if (!user.verified) {
        const otp = await generateOtp(user.email, "IV");

        if (otp) {
          const mailDetails = {
            subject: "Confirm your identity",
            to: user.email,
            body: {
              name: user.name,
              otp: otp.newOtp,
              message: `Please verify your email.<br /><br />
              Kindly enter the OTP to verify your email. OTP will expire in 10mins.`,
            },
          };

          const mail = sendMail(mailDetails);

          if (mail) {
            res.status(200).send({
              isSuccess: true,
              message: "User verification mail has been sent to the email.",
            });
          } else {
            res.status(400);
            throw new Error(
              "Failed to send user verification mail. Kindly login to verify user."
            );
          }
        } else {
          res.status(400);
          throw new Error(
            "Failed to generate OTP. Kindly login to verify user."
          );
        }
      } else {
        res.status(200).send({
          isSuccess: true,
          message: "User already verified",
        });
      }
    } else {
      res.status(401);
      throw new Error("Invalid user");
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userVerifyOTP = async (req, res) => {
  try {
    const { email, otp, otpType } = req.body;
    const findOtp = await OtpVerification.find({ email, otpType });

    if (!findOtp.length) {
      res.status(400);
      throw new Error("OTP expired. Kindly login to verify your account.");
    }

    const validOtp = findOtp[findOtp.length - 1];
    const verifyOtp = await bcrypt.compare(otp, validOtp.otp);

    if (validOtp.email === email && verifyOtp) {
      const user = await User.findOne({ email });

      if (user) {
        if (otpType === "IV") {
          if (!user.verified) {
            const verifyUser = await User.updateOne(
              { email },
              { verified: true },
              { new: true, rawResult: true }
            );

            const deleteOtp = await OtpVerification.deleteMany(
              { email, otpType: otpType },
              { rawResult: true }
            );

            if (verifyUser.modifiedCount === 1 && deleteOtp.deletedCount) {
              res.status(200).send({
                isSuccess: true,
                message: "User verified successfully",
              });
            } else {
              res.status(400);
              throw new Error(
                "User cannot be verified. Kindly login to verify your account."
              );
            }
          } else {
            res.status(400);
            throw new Error("User already verified. Kindly login.");
          }
        } else if (otpType === "FP") {
          const deleteOtp = await OtpVerification.deleteMany(
            { email, otpType: otpType },
            { rawResult: true }
          );

          if (deleteOtp.deletedCount) {
            res.status(200).send({
              isSuccess: true,
              message: "OTP for password reset validated successfully.",
            });
          } else {
            res.status(400);
            throw new Error("Invalid OTP for password reset. Try again.");
          }
        }
      } else {
        res.status(400);
        throw new Error("User not found. Kindly signup.");
      }
    } else {
      if (otpType === "IV") {
        res.status(400);
        throw new Error("Invalid OTP. Kindly login to verify your account.");
      } else if (otpType === "FP") {
        res.status(400);
        throw new Error("Invalid OTP. Try again.");
      }
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      const checkPassword = await user.checkPassword(password);

      if (!checkPassword) {
        res.status(400);
        throw new Error("Invalid credentials");
      }

      const tokenDetails = {
        _id: user._id,
        email: user.email,
      };
      const loginToken = generateToken(tokenDetails, "1h");

      // -------- COOKIE ---------

      // if (req.cookies && req.cookies[`${user._id}`]) {
      //   req.cookies[`${user._id}`] = "";
      // }

      // res.cookie(user._id, loginToken, {
      //   path: "/",
      //   expires: new Date(Date.now() + 1000 * 60 * 60),
      //   httpOnly: true,
      //   sameSite: "lax",
      // });

      // -------- COOKIE ---------

      let oldTokens = user.tokens || [];

      if (oldTokens.length) {
        oldTokens = oldTokens.filter((token) => {
          const timeDiff = (Date.now() - parseInt(token.signedAt)) / 1000;
          if (timeDiff < 1000 * 60 * 60) return token;
        });
      }

      const setToken = await User.findByIdAndUpdate(
        { _id: user._id },
        {
          tokens: [
            ...oldTokens,
            { token: loginToken, signedAt: Date.now().toString() },
          ],
        },
        { new: true, rawResult: true }
      );

      if (setToken.lastErrorObject.n <= 0) {
        res.status(400).send({ isSuccess: false, message: "Internal issue" });
      }

      res.status(200).send({
        isSuccess: true,
        message: "Successful login",
        token: loginToken,
      });
    } else {
      res.status(400);
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userDetails = async (req, res) => {
  try {
    const middlewareUser = req.user;
    const user = await User.findOne({ _id: middlewareUser._id });

    if (user) {
      res.status(200).send({
        isSuccess: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        verified: user.verified,
      });
    } else {
      res.status(401);
      throw new Error("Unknown user");
    }
  } catch (error) {
    res.status(500).send({ isSuccess: false, message: error.message });
  }
};

export const userLogout = async (req, res) => {
  try {
    const middleWareUser = req.user;
    if (middleWareUser) {
      // -------------- COOKIE ---------------
      // if (req.cookies && req.cookies[`${middleWareUser._id}`]) {
      //   req.cookies[`${middleWareUser._id}`] = "";
      //   res.clearCookie(`${middleWareUser._id}`);
      //   res
      //     .status(200)
      //     .send({ isSuccess: true, message: "User logged out successfully" });
      // } else {
      //   res
      //     .status(500)
      //     .send({
      //       isSuccess: true,
      //       message: "User not logged out. Kindly try again.",
      //     });
      // }
      // ------------- COOKIE -----------------

      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
      ) {
        const token = req.headers.authorization.split(" ")[1];

        if (!token) {
          res
            .status(404)
            .send({ isSuccess: false, message: "Authorization failed" });
        }

        const userTokens = await User.findOne({ _id: middleWareUser._id });

        if (!userTokens) {
          res.status(400).send({ isSuccess: false, message: "User not found" });
        }

        const newTokens = userTokens.tokens.filter((t) => t !== token);

        const updateLogout = await User.findByIdAndUpdate(
          { _id: middleWareUser._id },
          { tokens: newTokens },
          { new: true, rawResult: true }
        );

        if(updateLogout.lastErrorObject.n <= 0){
          return res.status(400).send({ isSuccess: false, message: "Internal issue" });
        }

        res.status(200).send({ isSuccess: true, message: "Logged out successfully" });
      }
    } else {
      res
        .status(400)
        .send({
          isSuccess: false,
          message: "User not logged out. Kindly try again.",
        });
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userResendOtp = async (req, res) => {
  try {
    const { email, otpType } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const otp = await generateOtp(user.email, otpType);

      if (otp) {
        let mailDetails = {};
        if (otpType === "IV") {
          mailDetails = {
            subject: "Confirm your identity",
            to: user.email,
            body: {
              name: user.name,
              otp: otp.newOtp,
              message: `Please verify your email.<br /><br />
                      Kindly enter the OTP to verify your email. OTP will expire in 10mins.`,
            },
          };
        } else if (otpType === "FP") {
          mailDetails = {
            subject: "Reset Password",
            to: user.email,
            body: {
              name: user.name,
              otp: otp.newOtp,
              message: `Want to reset your password?<br /><br />
                  Kindly enter the OTP to reset your password. OTP will expire in 10mins.`,
            },
          };
        }

        const mail = sendMail(mailDetails);

        if (mail) {
          if (otpType === "IV") {
            res.status(200).send({
              isSuccess: true,
              message: "User verification mail has been sent to the email.",
            });
          } else if (otpType === "FP") {
            res.status(200).send({
              isSuccess: true,
              message: "Password reset mail has been sent to the email.",
            });
          }
        } else {
          if (otpType === "IV") {
            res.status(400);
            throw new Error(
              "Failed to send user verification mail. Kindly login to verify user."
            );
          } else if (otpType === "FP") {
            res.status(400);
            throw new Error(
              "Failed to send password reset mail. Kindly retry."
            );
          }
        }
      } else {
        res.status(400);
        throw new Error("Failed to generate OTP.");
      }
    } else {
      res.status(400);
      throw new Error("Invalid user. Kindly signup.");
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userForgotPasswordOtpEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const otp = await generateOtp(user.email, "FP");

      if (otp) {
        const mailDetails = {
          subject: "Reset Password",
          to: user.email,
          body: {
            name: user.name,
            otp: otp.newOtp,
            message: `Want to reset your password?<br /><br />
                  Kindly enter the OTP to reset your password. OTP will expire in 10mins.`,
          },
        };

        const mail = sendMail(mailDetails);

        if (mail) {
          res.status(200).send({
            isSuccess: true,
            message:
              "Password reset mail has been sent to the email. Kindly enter the OTP sent to you email.",
          });
        } else {
          res.status(400);
          throw new Error("Failed to send password reset mail.");
        }
      } else {
        res.status(400);
        throw new Error("Failed to generate OTP. Kindly login to verify user.");
      }
    } else {
      res.status(400);
      throw new Error("User not found");
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userForgotPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400);
      throw new Error("User not found");
    }

    const hashedPassword = await bcrypt.hash(
      password,
      await bcrypt.genSalt(10)
    );
    const updatePassword = await User.updateOne(
      { email },
      { $set: { password: hashedPassword } },
      { new: true, rawResult: true }
    );

    if (updatePassword.modifiedCount === 1) {
      res
        .status(200)
        .send({ isSuccess: true, message: "Password reset successfully" });
    } else {
      res.status(500);
      throw new Error("Password cannot be reset. Try again.");
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const userAllUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ isSuccess: false, message: error.message });
  }
};
