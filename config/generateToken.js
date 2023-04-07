import jwt from "jsonwebtoken";

export const generateToken = (tokenDetails, expiresIn) => {
  return jwt.sign(
    {
      _id: tokenDetails._id,
      email: tokenDetails.email,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn,
    }
  );
};
