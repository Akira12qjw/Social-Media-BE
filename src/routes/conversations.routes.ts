import { Router } from "express";
import {
  getConversationsController,
  getMessageUsersController,
} from "../controllers/conversation.controllers";
import { paginationValidator } from "../middlewares/tweets.middlewares";
import {
  accessTokenValidator,
  getConversationsValidator,
  verifiedUserValidator,
} from "../middlewares/users.middlewares";
import { wrapRequestHandler } from "../utils/handlers";

const conversationsRouter = Router();

conversationsRouter.get(
  "/receivers/:receiver_id",
  accessTokenValidator,
  verifiedUserValidator,
  paginationValidator,
  getConversationsValidator,
  wrapRequestHandler(getConversationsController)
);

conversationsRouter.get(
  "/users",
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getMessageUsersController)
);

export default conversationsRouter;
