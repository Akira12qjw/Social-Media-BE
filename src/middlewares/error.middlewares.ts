import { NextFunction, Request, Response } from "express";
import { omit } from "lodash";
import HTTP_STATUS from "../constants/httpStatus";
import { ErrorWithStatus } from "../models/errors";

export const defaultErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (err instanceof ErrorWithStatus) {
      return res.status(err.status).json(omit(err, ["status"]));
    }
    const finalError: any = {};
    Object.getOwnPropertyNames(err).forEach((key) => {
      if (
        !Object.getOwnPropertyDescriptor(err, key)?.configurable ||
        !Object.getOwnPropertyDescriptor(err, key)?.writable
      ) {
        return;
      }
      finalError[key] = err[key];
    });
    res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: err.message,
      errorInfo: omit(err, ["stack"]),
    });
  } catch (error) {
    res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: "Internal Server Error",
      errorInfo: omit(error as any, ["stack"]),
    });
  }
};
