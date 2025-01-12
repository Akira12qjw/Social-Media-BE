import { Request, Response, NextFunction } from "express";
import { checkSchema, ParamSchema } from "express-validator";
import { JsonWebTokenError } from "jsonwebtoken";
import HTTP_STATUS from "~/constants/httpStatus";
import { USERS_MESSAGES } from "~/constants/messages";
import { ErrorWithStatus } from "~/models/errors";
import RefreshToken from "~/models/schemas/RefreshToken.schema";
// import { ErrorWithStatus } from "~/models/Errors";
import databaseService from "~/services/database.services";
import usersService from "~/services/users.services";
import { hashPassword } from "~/utils/crypto";
import { verifyToken } from "~/utils/jwt";
import { validate } from "~/utils/validation";
import { capitalize } from "lodash";
import { ObjectId } from "mongodb";
import { TokenPayload } from "~/models/requests/User.requests";
import { UserVerifyStatus } from "~/constants/enums";
import { REGEX_USERNAME } from "~/constants/regex";

const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED,
  },
  isString: {
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING,
  },
  isLength: {
    options: {
      min: 6,
      max: 50,
    },
    errorMessage: {
      errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50,
    },
  },
  isStrongPassword: {
    options: {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG,
  },
};

const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED,
  },
  isString: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING,
  },
  isLength: {
    options: {
      min: 6,
      max: 50,
    },
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50,
  },
  isStrongPassword: {
    options: {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
    },
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG,
  },

  custom: {
    options: (value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(
          USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD
        );
      }
      return true;
    },
  },
};

const imageSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: USERS_MESSAGES.IMAGE_URL_MUST_BE_STRING,
  },
  trim: true,
  isLength: {
    options: {
      min: 1,
      max: 400,
    },
    errorMessage: USERS_MESSAGES.IMAGE_URL_LENGTH,
  },
};

const nameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED,
  },
  isString: {
    errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING,
  },
  trim: true,
  isLength: {
    options: {
      min: 1,
      max: 100,
    },
    errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100,
  },
};

const dateOfBirthSchema: ParamSchema = {
  isISO8601: {
    options: {
      strict: true,
      strictSeparator: true,
    },
    errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_MUST_BE_ISO8601,
  },
};

const forgotPasswordTokenSchema: ParamSchema = {
  trim: true,
  custom: {
    options: async (value: string, { req }) => {
      if (!value) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED,
          status: HTTP_STATUS.UNAUTHORIZED,
        });
      }
      try {
        const decoded_forgot_password_token = await verifyToken({
          token: value,
          secretOrPublicKey: process.env
            .JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
        });
        const { user_id } = decoded_forgot_password_token;
        const user = await databaseService.users.findOne({
          _id: new ObjectId(user_id),
        });
        if (user === null) {
          throw new ErrorWithStatus({
            message: USERS_MESSAGES.USER_NOT_FOUND,
            status: HTTP_STATUS.UNAUTHORIZED,
          });
        }
        if (user.forgot_password_token !== value) {
          throw new ErrorWithStatus({
            message: USERS_MESSAGES.INVALID_FORGOT_PASSWORD_TOKEN,
            status: HTTP_STATUS.UNAUTHORIZED,
          });
        }
        req.decoded_forgot_password_token = decoded_forgot_password_token;
      } catch (error) {
        if (error instanceof JsonWebTokenError) {
          throw new ErrorWithStatus({
            message: capitalize(error.message),
            status: HTTP_STATUS.UNAUTHORIZED,
          });
        }
        throw error;
      }
      // console.log(decoded_refresh_token);
      return true;
    },
  },
};

const userIdSchema: ParamSchema = {
  custom: {
    options: async (value: string, { req }) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGES.INVALID_USER_ID,
          status: HTTP_STATUS.NOT_FOUND,
        });
      }
      const followed_user = await databaseService.users.findOne({
        _id: new ObjectId(value),
      });

      if (followed_user === null) {
        throw new ErrorWithStatus({
          message: USERS_MESSAGES.USER_NOT_FOUND,
          status: HTTP_STATUS.NOT_FOUND,
        });
      }
    },
  },
};

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID,
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseService.users.findOne({
              email: value,
              password: hashPassword(req.body.password),
            });
            if (user === null) {
              throw new Error(USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT);
            }
            req.user = user;
            return true;
          },
        },
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED,
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING,
        },
        isLength: {
          options: {
            min: 6,
            max: 50,
          },
          errorMessage: {
            errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50,
          },
        },
        isStrongPassword: {
          options: {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
          },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG,
        },
      },
    },
    ["body"]
  )
);

export const registerValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      email: {
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID,
        },
        trim: true,
        custom: {
          options: async (value) => {
            const isExistEmail = await usersService.checkEmailExist(value);
            if (isExistEmail) {
              throw new Error(USERS_MESSAGES.EMAIL_ALREADY_EXISTS);
            }
            return true;
          },
        },
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      date_of_birth: dateOfBirthSchema,
    },
    ["body"]
  )
);

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value: string, { req }) => {
            const access_token = (value || "").split(" ")[1];
            if (!access_token) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED,
              });
            }
            try {
              const decoded_authorization = await verifyToken({
                token: access_token,
                secretOrPublicKey: process.env
                  .JWT_SECRET_ACCESS_TOKEN as string,
              });
              (req as Request).decoded_authorization =
                await decoded_authorization;
            } catch (error) {
              throw new ErrorWithStatus({
                message: capitalize((error as JsonWebTokenError).message),
                status: HTTP_STATUS.UNAUTHORIZED,
              });
            }

            return true;
          },
        },
      },
    },
    ["headers"]
  )
);

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED,
              });
            }
            try {
              const [decoded_refresh_token, refresh_token] = await Promise.all([
                verifyToken({
                  token: value,
                  secretOrPublicKey: process.env
                    .JWT_SECRET_REFRESH_TOKEN as string,
                }),
                databaseService.refresh_token.findOne({ token: value }),
              ]);
              if (refresh_token === null) {
                throw new ErrorWithStatus({
                  message: USERS_MESSAGES.USED_REFRESH_TOKEN_OR_NOT_EXIST,
                  status: HTTP_STATUS.UNAUTHORIZED,
                });
              }
              (req as Request).decoded_refresh_token = decoded_refresh_token;
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED,
                });
              }
              throw error;
            }
            // console.log(decoded_refresh_token);
            return true;
          },
        },
      },
    },
    ["body"]
  )
);

export const emailVerifyTokenValidator = validate(
  checkSchema({
    email_verify_token: {
      trim: true,
      custom: {
        options: async (value: string, { req }) => {
          if (!value) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED,
              status: HTTP_STATUS.UNAUTHORIZED,
            });
          }
          try {
            const decoded_email_verify_token = await verifyToken({
              token: value,
              secretOrPublicKey: process.env
                .JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
            });

            (req as Request).decoded_email_verify_token =
              decoded_email_verify_token;
          } catch (error) {
            if (error instanceof JsonWebTokenError) {
              throw new ErrorWithStatus({
                message: capitalize((error as JsonWebTokenError).message),
                status: HTTP_STATUS.UNAUTHORIZED,
              });
            }
            throw error;
          }

          // console.log(decoded_refresh_token);
          return true;
        },
      },
    },
  })
);

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID,
        },
        trim: true,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseService.users.findOne({
              email: value,
            });
            if (user === null) {
              throw new Error(USERS_MESSAGES.USER_NOT_FOUND);
            }
            req.user = user;
            return true;
          },
        },
      },
    },
    ["body"]
  )
);

export const verifyForgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordTokenSchema,
    },
    ["body"]
  )
);

export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      forgot_password_token: forgotPasswordTokenSchema,
    },
    ["body"]
  )
);

export const verifiedUserValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { verify } = req.decoded_authorization as TokenPayload;
  if (verify !== UserVerifyStatus.Verified) {
    return next(
      new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_VERIFIED,
        status: HTTP_STATUS.FORBIDDEN,
      })
    );
  }
  next();
};

export const updateMeValidator = validate(
  checkSchema(
    {
      name: { ...nameSchema, optional: true, notEmpty: undefined },
      date_of_birth: { ...dateOfBirthSchema, optional: true },
      bio: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.BIO_MUST_BE_STRING,
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200,
          },
          errorMessage: USERS_MESSAGES.BIO_LENGTH,
        },
      },
      location: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.LOCATION_MUST_BE_STRING,
        },
        trim: true,

        isLength: {
          options: {
            min: 1,
            max: 200,
          },
          errorMessage: USERS_MESSAGES.LOCATION_LENGTH,
        },
      },
      website: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.WEBSITE_MUST_BE_STRING,
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200,
          },
          errorMessage: USERS_MESSAGES.WEBSITE_LENGTH,
        },
      },
      username: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.USERNAME_MUST_BE_STRING,
        },
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!REGEX_USERNAME.test(value)) {
              throw new Error(USERS_MESSAGES.USERNAME_INVALID);
            }
            const user = await databaseService.users.findOne({
              username: value,
            });

            if (user) {
              throw Error(USERS_MESSAGES.USERNAME_EXISTED);
            }
          },
        },
      },
      avatar: imageSchema,
      cover_photo: imageSchema,
    },
    ["body"]
  )
);

export const followValidator = validate(
  checkSchema(
    {
      followed_user_id: userIdSchema,
    },
    ["body"]
  )
);

export const unfollowValidator = validate(
  checkSchema(
    {
      user_id: userIdSchema,
    },
    ["params"]
  )
);

export const changePasswordValidator = validate(
  checkSchema({
    old_password: {
      ...passwordSchema,
      custom: {
        options: async (value: string, { req }) => {
          const { user_id } = (req as Request)
            .decoded_authorization as TokenPayload;
          const user = await databaseService.users.findOne({
            _id: new ObjectId(user_id),
          });
          if (!user) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.USER_NOT_FOUND,
              status: HTTP_STATUS.NOT_FOUND,
            });
          }
          const { password } = user;
          const isMatch = hashPassword(value) === password;
          if (!isMatch) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.OLD_PASSWORD_NOT_MATCH,
              status: HTTP_STATUS.UNAUTHORIZED,
            });
          }
        },
      },
    },

    password: passwordSchema,
    confirm_password: confirmPasswordSchema,
  })
);

export const isUserLoggedInValidator = (
  middleware: (req: Request, res: Response, next: NextFunction) => void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      return middleware(req, res, next);
    }
    next();
  };
};

export const getConversationsValidator = validate(
  checkSchema(
    {
      receiver_id: userIdSchema,
    },
    ["params"]
  )
);
