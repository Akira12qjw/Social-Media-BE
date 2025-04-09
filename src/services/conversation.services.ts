import { ObjectId } from "mongodb";
import databaseService from "./database.services";

class ConversationService {
  async getConversations({
    sender_id,
    receiver_id,
    limit,
    page,
  }: {
    sender_id: string;
    receiver_id: string;
    limit: number;
    page: number;
  }) {
    const match = {
      $or: [
        {
          sender_id: new ObjectId(sender_id),
          receiver_id: new ObjectId(receiver_id),
        },
        {
          sender_id: new ObjectId(receiver_id),
          receiver_id: new ObjectId(sender_id),
        },
      ],
    };
    const conversations = await databaseService.conversations
      .find(match)
      .sort({ created_at: -1 })
      .skip(limit * (page - 1))
      .limit(limit)
      .toArray();
    const total = await databaseService.conversations.countDocuments(match);
    return {
      conversations,
      total,
    };
  }

  async getMessageUsers(user_id: string) {
    const conversations = await databaseService.conversations
      .aggregate([
        {
          $match: {
            $or: [
              { sender_id: new ObjectId(user_id) },
              { receiver_id: new ObjectId(user_id) },
            ],
          },
        },
        {
          $sort: { created_at: -1 },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$sender_id", new ObjectId(user_id)] },
                "$receiver_id",
                "$sender_id",
              ],
            },
            lastMessage: { $first: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            _id: "$user._id",
            name: "$user.name",
            username: "$user.username",
            avatar: "$user.avatar",
            last_message: "$lastMessage.content",
            created_at: "$lastMessage.created_at",
          },
        },
      ])
      .toArray();

    return conversations;
  }
}
const conversationService = new ConversationService();
export default conversationService;
