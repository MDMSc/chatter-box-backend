import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const cookie = req.headers.cookie;
    res.status(200).send(cookie);
    if(!cookie){
      res.status(401);
      throw new Error("User not logged in");
    }

    const authToken = cookie.split("=")[1];

    if (!authToken) {
      res.status(401);
      throw new Error("Invalid User");
    }

    jwt.verify(authToken, process.env.JWT_SECRET_KEY, (error, decoded) => {
      if (error) {
        res.status(500);
        throw new Error(`${error.message}`);
      }

      req.user = decoded;
      next();
    });
    
  } catch (error) {
    res.status(401).send({ isSuccess: false, message: error.message });
  }
};
