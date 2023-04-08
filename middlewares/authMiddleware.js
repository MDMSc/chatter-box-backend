import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  // ------------------------- COOKIE AUTH (Not working in render) ---------------------------

  try {
    const cookie = req.headers.cookie;

    // if(!cookie){
    //   res.status(401);
    //   throw new Error("User not logged in");
    // }

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

  // --------------------- Bearer Token ------------------------

  // let token;

  // if (
  //   req.headers.authorization &&
  //   req.headers.authorization.startswith("Bearer")
  // ) {
  //   try {
  //     token = req.headers.authorization.split(" ")[1];

  //     if (!token) {
  //       res.status(401);
  //       throw new Error("User not logged in");
  //     }

  //     jwt.verify(token, process.env.JWT_SECRET_KEY, (error, decoded) => {
  //       if (error) {
  //         res.status(500);
  //         throw new Error(`${error.message}`);
  //       }

  //       req.user = decoded;
  //       console.log(req.user);
  //       next();
  //     });
  //   } catch (error) {
  //     res.status(401).send({ isSuccess: false, message: error.message });
  //   }
  // }
};
