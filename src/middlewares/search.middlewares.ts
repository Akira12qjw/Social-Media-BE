import { checkSchema } from "express-validator";
import { MediaTypeQuery } from "~/constants/enums";
import { validate } from "~/utils/validation";

export const searchValidator = validate(
  checkSchema(
    {
      content: {
        isString: {
          errorMessage: "Content must be a string",
        },
      },
      media_type: {
        optional: true,
        isIn: {
          options: [Object.values(MediaTypeQuery)],
        },
        errorMessage: `Media type must be one of ${Object.values(MediaTypeQuery).join(", ")}`,
      },
      people_follow: {
        optional: true,
        isIn: {
          options: [["0", "1"]],
          errorMessage: "People follow must be 0 or 1",
        },
      },
    },
    ["query"]
  )
);
