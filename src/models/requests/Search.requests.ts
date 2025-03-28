import { MediaTypeQuery, PeopleFollow } from "../../constants/enums";
import { Pagination } from "./Tweet.requests";
import { Query } from "express-serve-static-core";

export interface SearchQuery extends Pagination, Query {
  content: string;
  media_type?: MediaTypeQuery;
  people_pollow?: PeopleFollow;
}
