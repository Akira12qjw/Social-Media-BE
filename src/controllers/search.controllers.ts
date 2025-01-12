import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { SearchQuery } from "~/models/requests/Search.requests";
import { Pagination } from "~/models/requests/Tweet.requests";
import searchService from "~/services/search.services";

export const searchController = async (
  req: Request<ParamsDictionary, any, any, SearchQuery>,
  res: Response
) => {
  const limit = Number(req.query.limit);
  const page = Number(req.query.page);
  const result = await searchService.search({
    limit,
    page,
    content: req.query.content,
    media_type: req.query.media_type,
    people_follow: req.query.people_pollow,
    user_id: req.decoded_authorization?.user_id as string,
  });
  res.json({
    message: "Search Successfully",
    result: {
      tweets: result.tweets,
      limit,
      page,
      totalpage: Math.ceil(result.total / limit),
    },
  });
};
