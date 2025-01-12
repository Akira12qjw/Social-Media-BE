import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { BOOKMARK_MESSAGES, LIKE_MESSAGES } from "~/constants/messages";
import { BookmarkTweetReqBody } from "~/models/requests/Bookmark.requests";
import { LikeTweetReqBody } from "~/models/requests/Like.requests";

import { TokenPayload } from "~/models/requests/User.requests";
import bookmarksService from "~/services/bookmarks.services";
import likesService from "~/services/likes.services";

export const likeTweetController = async (
  req: Request<ParamsDictionary, any, LikeTweetReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await likesService.likeTweet(user_id, req.body.tweet_id);
  return res.json({
    message: LIKE_MESSAGES.LIKE_SUCCESSFULLY,
    result,
  });
};

export const unlikeTweetController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await likesService.likeTweet(user_id, req.params.tweet_id);
  return res.json({
    message: LIKE_MESSAGES.UNLIKE_SUCCESSFULLY,
    result,
  });
};
