import express from "express";
import { messageGetAllUnreadMessages, messageGetMessages, messageReadMessage, messageSendMessage } from "../controllers/messageController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, messageSendMessage);
router.get("/", authMiddleware, messageGetAllUnreadMessages);
router.get("/:chatId", authMiddleware, messageGetMessages);
router.put("/:chatId", authMiddleware, messageReadMessage);

export const messageRoutes = router;