import { Request, Response } from "express";
import { GetConversationsParams } from "../models/requests/Conversation.requests";
import conversationService from "../services/conversation.services";
import { TokenPayload } from "../models/requests/User.requests";

export const getConversationsController = async (
  req: Request<GetConversationsParams>,
  res: Response
) => {
  const { receiver_id } = req.params;
  const limit = Number(req.query.limit);
  const page = Number(req.query.page);
  const sender_id = req.decoded_authorization?.user_id as string;
  const result = await conversationService.getConversations({
    sender_id,
    receiver_id,
    limit,
    page,
  });
  return res.json({
    result: {
      limit,
      page,
      total_page: Math.ceil(result.total / limit),
      conversations: result.conversations,
    },
    message: "Get conversations successfully",
  });
};

export const getMessageUsersController = async (
  req: Request,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await conversationService.getMessageUsers(user_id);

  return res.json({
    message: "Get message users successfully",
    result,
  });
};
