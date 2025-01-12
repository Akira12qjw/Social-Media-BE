import { config } from "dotenv";
import { NextFunction, Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { pick } from "lodash";
import { ObjectId } from "mongodb";
import { UserVerifyStatus } from "~/constants/enums";
import HTTP_STATUS from "~/constants/httpStatus";
import { USERS_MESSAGES } from "~/constants/messages";
import {
  ChangePasswordReqBody,
  FollowReqBody,
  ForgotPasswordReqBody,
  GetProfileReqParams,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UnfollowReqParams,
  UpdateMeReqBody,
  VerifyEmailReqBody,
  VerifyForgotPasswordReqBody,
} from "~/models/requests/User.requests";
import User from "~/models/schemas/User.schema";
import databaseService from "~/services/database.services";
import usersService from "~/services/users.services";
config();
export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>,
  res: Response
) => {
  const user = req.user as User;
  const user_id = user._id as ObjectId;
  const result = await usersService.login({
    user_id: user_id.toString(),
    verify: user.verify,
  });
  return res.json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result,
  });
};

export const oauthController = async (req: Request, res: Response) => {
  const { code } = req.query;
  const result = await usersService.oauth(code as string);
  console.log(req.url);
  const url_redirect = `${process.env.CLIENT_REDIRECT_CALLBACK}?access_token=${result.access_token}&refresh_token=${result.refresh_token}&new_user=${result.newUser}`;
  return res.redirect(url_redirect);
};

export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  const result = await usersService.register(req.body);
  return res.json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result,
  });
};

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body;
  const result = await usersService.logout(refresh_token);
  return res.json(result);
};

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body;
  const { user_id, verify, exp } = req.decoded_refresh_token as TokenPayload;
  const result = await usersService.refreshToken({
    user_id,
    refresh_token,
    verify,
    exp,
  });
  return res.json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result,
  });
};

export const emailVerifyController = async (
  req: Request<ParamsDictionary, any, VerifyEmailReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload;
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id),
  });

  //Nếu không tìm thấy User
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND,
    });
  }
  // Đã verify rồi thì sẽ không báo lỗi
  // Mà sẽ trả về status OK với message là đã verify trước đó rồi
  if (user.email_verify_token === "") {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE,
    });
  }
  const result = await usersService.verifyEmail(user_id);
  console.log(result);
  return res.json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS,
    result,
  });
};

export const resendVerifyEmailController = async (
  req: Request,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id),
  });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND,
    });
  }
  if (user.verify === UserVerifyStatus.Verified) {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE,
    });
  }

  const result = await usersService.resendVerifyEmail(user_id, user.email);
  return res.json(result);
};

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,

  res: Response,
  next: NextFunction
) => {
  const { _id, verify, email } = req.user as User;
  const result = await usersService.forgotPassword({
    user_id: (_id as ObjectId).toString(),
    verify,
    email,
  });
  return res.json(result);
};

export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  return res.json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS,
  });
};

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_forgot_password_token as TokenPayload;
  const { password } = req.body;
  const result = await usersService.resetPassword(user_id, password);
  return res.json(result);
};

export const getMeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const user = await usersService.getMe(user_id);
  return res.json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: user,
  });
};

export const getProfileController = async (
  req: Request<GetProfileReqParams>,
  res: Response,
  next: NextFunction
) => {
  const { username } = req.params;
  const user = await usersService.getProfile(username);
  return res.json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESS,
    result: user,
  });
};

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { body } = req;
  const user = usersService.updateMe(user_id, body);
  return res.json({
    message: USERS_MESSAGES.UPDATE_ME_SUCCESS,
    result: user,
  });
};

export const followController = async (
  req: Request<ParamsDictionary, any, FollowReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { followed_user_id } = req.body;
  const result = usersService.follow(user_id, followed_user_id);
  return res.json(result);
};

export const unfollowController = async (
  req: Request<UnfollowReqParams>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { user_id: followed_user_id } = req.params;
  const result = usersService.unfollow(user_id, followed_user_id);
  return res.json(result);
};

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { password } = req.body;
  const result = await usersService.changePassword(user_id, password);
  return res.json(result);
};
