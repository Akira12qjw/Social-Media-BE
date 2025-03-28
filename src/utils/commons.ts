import { Request } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import { capitalize } from "lodash";
import { envConfig } from "../constants/config";
import HTTP_STATUS from "../constants/httpStatus";
import { USERS_MESSAGES } from "../constants/messages";
import { ErrorWithStatus } from "../models/errors";
import { verifyToken } from "../utils/jwt";

export const numberEnumToArray = (numberEnum: {
  [key: string]: string | number;
}) => {
  return Object.values(numberEnum).filter(
    (value) => typeof value === "number"
  ) as number[];
};
export const verifyAccessToken = async (
  access_token: string,
  req?: Request
) => {
  if (!access_token) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
  }
  try {
    const decoded_authorization = await verifyToken({
      token: access_token,
      secretOrPublicKey: envConfig.jwtSecretAccessToken,
    });
    if (req) {
      (req as Request).decoded_authorization = decoded_authorization;
      return true;
    }
    return decoded_authorization;
  } catch (error) {
    throw new ErrorWithStatus({
      message: capitalize((error as JsonWebTokenError).message),
      status: HTTP_STATUS.UNAUTHORIZED,
    });
  }
};
