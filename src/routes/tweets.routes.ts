import { Router } from "express";
import {
  createTweetController,
  getNewFeedsController,
  getTweetChildrenController,
  getTweetController,
} from "~/controllers/tweets.controllers";
import {
  audienceValidator,
  createTweetValidator,
  getTweetChildrenValidator,
  paginationValidator,
  tweetIdValidator,
} from "~/middlewares/tweets.middlewares";
import {
  accessTokenValidator,
  isUserLoggedInValidator,
  verifiedUserValidator,
} from "~/middlewares/users.middlewares";
import { wrapRequestHandler } from "~/utils/handlers";

const tweetsRouter = Router();

tweetsRouter.post(
  "/",
  accessTokenValidator,
  verifiedUserValidator,
  createTweetValidator,
  wrapRequestHandler(createTweetController)
);

tweetsRouter.get(
  "/:tweet_id",
  tweetIdValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidator),
  audienceValidator,
  wrapRequestHandler(getTweetController)
);

tweetsRouter.get(
  "/:tweet_id/children",
  tweetIdValidator,
  paginationValidator,
  getTweetChildrenValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidator),
  audienceValidator,
  wrapRequestHandler(getTweetChildrenController)
);

tweetsRouter.get(
  "/",
  paginationValidator,
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getNewFeedsController)
);
export default tweetsRouter;
