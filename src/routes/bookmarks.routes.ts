import { Router } from "express";
import {
  bookmarkTweetController,
  unbookmarkTweetController,
} from "~/controllers/bookmarks.controllers";
import { createTweetController } from "~/controllers/tweets.controllers";
import {
  createTweetValidator,
  tweetIdValidator,
} from "~/middlewares/tweets.middlewares";
import {
  accessTokenValidator,
  verifiedUserValidator,
} from "~/middlewares/users.middlewares";
import { wrapRequestHandler } from "~/utils/handlers";

const bookmarksRouter = Router();

bookmarksRouter.post(
  "",
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(bookmarkTweetController)
);

bookmarksRouter.delete(
  "/tweets/:tweet_id",
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(unbookmarkTweetController)
);

export default bookmarksRouter;
