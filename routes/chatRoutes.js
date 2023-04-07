import express from "express";
import {
  chatAccessChats,
  chatCreateGroup,
  chatFetchChats,
  chatRenameGroup,
  chatUserAddToGroup,
  chatUserRemoveFromGroup,
} from "../controllers/chatController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, chatAccessChats);
router.get("/", authMiddleware, chatFetchChats);
router.post("/create-group", authMiddleware, chatCreateGroup);
router.put("/rename-group", authMiddleware, chatRenameGroup);
router.put("/group-add-user", authMiddleware, chatUserAddToGroup);
router.put("/group-remove-user", authMiddleware, chatUserRemoveFromGroup);

export const chatRoutes = router;
