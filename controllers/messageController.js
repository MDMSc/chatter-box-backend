import { Chat } from "../models/chatModel.js";
import { Message } from "../models/messageModel.js";
import { User } from "../models/userModel.js";

export const messageSendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    res.status(400).send({ isSuccess: false, message: "Invalid data" });
  }
  let newMessage = {
    sender: req.user._id,
    content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    if (message) {
      message = await message.populate("sender", "name pic email");
      message = await message.populate("chat");
      message = await message.populate("readBy", "name email pic");
      message = await User.populate(message, {
        path: "chat.users",
        select: "name pic email",
      });

      const updateChat = await Chat.findOneAndUpdate(
        { _id: chatId },
        {
          latestMessage: message,
        },
        {
          new: true,
          rawResult: true,
        }
      );

      if (updateChat.lastErrorObject.updatedExisting) {
        res.status(200).send(message);
      }
    }
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};

export const messageGetAllUnreadMessages = async (req, res) => {
  try {
    const chats = await Chat.find(
      { users: { $in: [req.user._id] } },
      { _id: 1 }
    );

    const chatIds = chats.map((chat) => chat._id);

    let messages = await Message.find({
      chat: { $in: chatIds },
      sender: { $ne: req.user._id },
      readBy: { $nin: [req.user._id] },
    })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("readBy", "name email pic");

    messages = await User.populate(messages, {
      path: "chat.users",
      select: "name email pic",
    });

    res.status(200).send(messages);
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};

export const messageGetMessages = async (req, res) => {
  try {
    let messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("readBy", "name email pic");

    messages = await User.populate(messages, {
      path: "chat.users",
      select: "name email pic",
    });

    res.status(200).send(messages);
  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};

export const messageReadMessage = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId });

    if (!chat) {
      res.status(400).send({ isSuccess: false, message: "No chat found" });
    }

    const updateReadMessage = await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user._id },
        readBy: { $nin: [req.user._id] },
      },
      { $push: { readBy: req.user._id } },
      {
        new: true,
      }
    );

    res.status(200).send({ isSuccess: true, message: `Messages read by user` });

  } catch (error) {
    res.status(400).send({ isSuccess: false, message: `${error.message}` });
  }
};
