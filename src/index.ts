import express from "express";
import { UPLOAD_VIDEO_DIR } from "~/constants/dir";
import { defaultErrorHandler } from "~/middlewares/error.middlewares";
import mediasRouter from "~/routes/medias.routes";
import staticRouter from "~/routes/static.routes";
import usersRouter from "~/routes/users.routes";
import databaseService from "~/services/database.services";
import cors, { CorsOptions } from "cors";
import tweetsRouter from "~/routes/tweets.routes";
import bookmarksRouter from "~/routes/bookmarks.routes";
import likesRouter from "~/routes/likes.routes";
import searchRouter from "~/routes/search.routes";
import { createServer } from "http";
import conversationsRouter from "~/routes/conversations.routes";
import initSocket from "~/utils/socket";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import YAML from "yaml";
// import fs from 'fs'
// import path from 'path'
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { envConfig, isProduction } from "~/constants/config";
import { initFolder } from "./utils/files";
// const file = fs.readFileSync(path.resolve('twitter-swagger.yaml'), 'utf8')
// const swaggerDocument = YAML.parse(file)

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "X clone (Twitter API)",
      version: "1.0.0",
    },
    servers: [
      {
        url: isProduction
          ? "https://social-media-be-lilac.vercel.app"
          : `http://localhost:${process.env.PORT || envConfig.port}`,
        description: isProduction ? "Production server" : "Development server",
      },
    ],
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

// Add HTTPS redirect middleware for production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

const corsOptions: CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// Enable pre-flight for all routes
app.options("*", cors(corsOptions));

const port = process.env.PORT || envConfig.port;

// Tạo folder upload
initFolder();

// Add default route
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// Add health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

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

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
