import { Chat } from "../models/chatModel.js";
import { User } from "../models/userModel.js";

export const chatAccessChats = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("UserId param not sent with request");
  }

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password -verified")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name email pic",
  });

  if (isChat.length > 0) {
    res.status(200).send(isChat[0]);
  } else {
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);

      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password -verified"
      );
      res.status(200).send(fullChat);
    } catch (error) {
      res.status(400).send({ isSuccess: false, message: error.message });
    }
  }
};

export const chatFetchChats = async (req, res) => {
  try {
    let userChats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password -verified")
      .populate("latestMessage")
      .populate("groupAdmin", "-password -verified")
      .sort({ updatedAt: -1 });

    userChats = await User.populate(userChats, {
      path: "latestMessage.sender",
      select: "name email pic",
    });

    res.status(200).send(userChats);
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: error.message });
  }
};

export const chatCreateGroup = async (req, res) => {
  if (!req.body.users || !req.body.chatName) {
    return res
      .status(400)
      .send({ isSuccess: false, message: "All fields are required" });
  }

  const users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res.status(400).send({
      isSuccess: false,
      message: "A minimum of 2 members required to create a group chat",
    });
  }

  users.push(req.user);

  try {
    const createGroupChat = await Chat.create({
      chatName: req.body.chatName,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    if (!createGroupChat) {
      return res.status(400).send({
        isSuccess: false,
        message: `The group ${req.body.chatName} cannot be created`,
      });
    }

    const fullGroupChat = await Chat.findOne({ _id: createGroupChat._id })
      .populate("users", "-password -verified")
      .populate("groupAdmin", "-password -verified");

    res.status(200).send(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(`${error.message}`);
  }
};

export const chatRenameGroup = async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    if (!chatId || !chatName) {
      return res
        .status(400)
        .send({ isSuccess: false, message: "All fields are required" });
    }

    const groupChat = await Chat.findOne({ _id: chatId, isGroupChat: true });

    if (!groupChat) {
      return res
        .status(400)
        .send({ isSuccess: false, message: "Group chat not found" });
    }

    const renameGroup = await Chat.updateOne(
      { _id: groupChat._id },
      { $set: { chatName: chatName } },
      { new: true, rawResult: true }
    );

    if (renameGroup.modifiedCount) {
      const updatedGroup = await Chat.findOne({ _id: groupChat._id })
        .populate("users", "-password -verified")
        .populate("groupAdmin", "-password -verified");
      res.status(200).send(updatedGroup);
    } else {
      return res
        .status(500)
        .send({ isSuccess: false, message: "Failed to rename group chat" });
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};

export const chatUserAddToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res
        .status(400)
        .send({ isSuccess: false, message: "All fields are required" });
    }

    const groupChat = await Chat.findOne({
      _id: chatId,
      isGroupChat: true,
    });

    if (!groupChat) {
      return res
        .status(400)
        .send({ isSuccess: false, message: "Group chat not found" });
    }

    const checkUser = groupChat.users.includes(userId);
    if (checkUser) {
      return res
        .status(400)
        .send({
          isSuccess: false,
          message: "User already added to the group chat",
        });
    }

    const addUser = await Chat.updateOne(
      {
        _id: chatId,
      },
      {
        $push: { users: userId },
      },
      {
        new: true,
        rawResult: true,
      }
    );

    if (addUser.modifiedCount) {
      const updatedGroup = await Chat.findOne({ _id: chatId })
        .populate("users", "-password -verified")
        .populate("groupAdmin", "-password -verified");
      res.status(200).send(updatedGroup);
    } else {
      return res.status(500).send({
        isSuccess: false,
        message: "Failed to add user to group chat",
      });
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};

export const chatUserRemoveFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res
        .status(400)
        .send({ isSuccess: false, message: "All fields are required" });
    }

    const groupChat = await Chat.findOne({
      _id: chatId,
      isGroupChat: true,
    });

    if (!groupChat) {
      return res
        .status(400)
        .send({ isSuccess: false, message: "Group chat not found" });
    }

    const checkUser = groupChat.users.includes(userId);
    if (!checkUser) {
      return res
        .status(400)
        .send({
          isSuccess: false,
          message: "User cannot be found in the group chat",
        });
    }

    const updateConditions = String(groupChat.groupAdmin) !== userId ? {
      $pull: { users: userId },
    } : {
      $pull: { users: userId },
      $set: { groupAdmin: groupChat.users[0]}
    };

    const removeUser = await Chat.updateOne(
      {
        _id: chatId,
      },
      updateConditions,
      {
        new: true,
        rawResult: true,
      }
    );

    if (removeUser.modifiedCount) {
      const updatedGroup = await Chat.findOne({ _id: chatId })
        .populate("users", "-password -verified")
        .populate("groupAdmin", "-password -verified");
      res.status(200).send(updatedGroup);
    } else {
      return res.status(500).send({
        isSuccess: false,
        message: "Failed to remove user from group chat",
      });
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};
