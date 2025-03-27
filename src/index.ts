import express from "express";
import { UPLOAD_VIDEO_DIR } from "~/constants/dir";
import { defaultErrorHandler } from "~/middlewares/error.middlewares";
import mediasRouter from "~/routes/medias.routes";
import staticRouter from "~/routes/static.routes";
import usersRouter from "~/routes/users.routes";
import databaseService from "~/services/database.services";
import { initFolder } from "~/utils/files";
import cors, { CorsOptions } from "cors";
import tweetsRouter from "~/routes/tweets.routes";
import bookmarksRouter from "~/routes/bookmarks.routes";
import likesRouter from "~/routes/likes.routes";
import searchRouter from "~/routes/search.routes";
import { createServer } from "http";
import initSocket from "~/utils/socket";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import YAML from "yaml";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { envConfig, isProduction } from "~/constants/config";
import conversationsRouter from "./routes/conversations.routes";
// import { Faker } from "@faker-js/faker";
// const file = fs.readFileSync(path.resolve("twitter-swagger.yaml"), "utf8");
// const swaggerDocument = YAML.parse(file);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "X clone (Twitter API)",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    persistAuthorization: true,
  },
  apis: ["./openapi/*.yaml"], // files containing annotations as above
};
const openapiSpecification = swaggerJsdoc(options);

databaseService.connect().then(() => {
  databaseService.indexUser();
  databaseService.indexRefreshToken();
  databaseService.indexVideoStatus();
  databaseService.indexFollowers();
  databaseService.indexTweets();
});
const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // store: ... , // Use an external store for more precise rate limiting
});
app.use(limiter);

const httpServer = createServer(app);
app.use(helmet());
const corsOptions: CorsOptions = {
  origin: ["http://localhost:3000"], // Thêm domain của client
  credentials: true, // Cho phép gửi cookie qua CORS
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
const port = envConfig.port;

// Tạo folder upload
initFolder();
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));
app.use("/users", usersRouter);
app.use("/medias", mediasRouter);
app.use("/tweets", tweetsRouter);
app.use("/bookmarks", bookmarksRouter);
app.use("/likes", likesRouter);
app.use("/search", searchRouter);
app.use("/conversations", conversationsRouter);
app.use("/static", staticRouter);
app.use("/static/video", express.static(UPLOAD_VIDEO_DIR));
app.use(defaultErrorHandler);

initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
