import { Router } from "express";
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidator,
  verifyForgotPasswordTokenValidator,
} from "../middlewares/users.middlewares";
import {
  changePasswordController,
  emailVerifyController,
  followController,
  forgotPasswordController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  oauthController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  unfollowController,
  updateMeController,
  verifyForgotPasswordController,
} from "../controllers/user.controllers";
import { wrapRequestHandler } from "../utils/handlers";
import { fillterMiddleware } from "../middlewares/common.middlewares";
import { UpdateMeReqBody } from "../models/requests/User.requests";
const usersRouter = Router();

usersRouter.post("/login", loginValidator, wrapRequestHandler(loginController));

usersRouter.get("/oauth/google", wrapRequestHandler(oauthController));

usersRouter.post(
  "/register",
  registerValidator,
  wrapRequestHandler(registerController)
);

usersRouter.post(
  "/logout",
  accessTokenValidator,
  refreshTokenValidator,
  wrapRequestHandler(logoutController)
);

usersRouter.post(
  "/verify-email",
  emailVerifyTokenValidator,
  wrapRequestHandler(emailVerifyController)
);

usersRouter.post(
  "/resend-verify-email",
  accessTokenValidator,
  wrapRequestHandler(resendVerifyEmailController)
);

usersRouter.post(
  "/forgot-password",
  forgotPasswordValidator,
  wrapRequestHandler(forgotPasswordController)
);

usersRouter.post(
  "/verify-forgot-password",
  verifyForgotPasswordTokenValidator,
  wrapRequestHandler(verifyForgotPasswordController)
);

usersRouter.post(
  "/reset-password",
  resetPasswordValidator,
  wrapRequestHandler(resetPasswordController)
);

usersRouter.get(
  "/me",
  accessTokenValidator,
  wrapRequestHandler(getMeController)
);

usersRouter.patch(
  "/me",
  accessTokenValidator,
  verifiedUserValidator,
  updateMeValidator,
  fillterMiddleware<UpdateMeReqBody>([
    "name",
    "date_of_birth",
    "bio",
    "location",
    "website",
    "username",
    "avatar",
    "cover_photo",
  ]),
  wrapRequestHandler(updateMeController)
);

usersRouter.get("/:username", wrapRequestHandler(getProfileController));

usersRouter.post(
  "/follow",
  accessTokenValidator,
  verifiedUserValidator,
  followValidator,
  wrapRequestHandler(followController)
);

usersRouter.delete(
  "/follow/:user_id",
  accessTokenValidator,
  verifiedUserValidator,
  unfollowValidator,
  wrapRequestHandler(unfollowController)
);

usersRouter.put(
  "/change-password",
  accessTokenValidator,
  verifiedUserValidator,
  changePasswordValidator,
  wrapRequestHandler(changePasswordController)
);

export default usersRouter;
