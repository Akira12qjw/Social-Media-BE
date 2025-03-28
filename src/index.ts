import express from "express";
import { UPLOAD_VIDEO_DIR } from "./constants/dir";
import { defaultErrorHandler } from "./middlewares/error.middlewares";
import mediasRouter from "./routes/medias.routes";
import staticRouter from "./routes/static.routes";
import usersRouter from "./routes/users.routes";
import databaseService from "./services/database.services";
import cors, { CorsOptions } from "cors";
import tweetsRouter from "./routes/tweets.routes";
import bookmarksRouter from "./routes/bookmarks.routes";
import likesRouter from "./routes/likes.routes";
import searchRouter from "./routes/search.routes";
import { createServer } from "http";
import conversationsRouter from "./routes/conversations.routes";
import initSocket from "./utils/socket";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import YAML from "yaml";
// import fs from 'fs'
// import path from 'path'
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { envConfig, isProduction } from "./constants/config";
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
          ? "https://social-media-be-psi.vercel.app"
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
  apis: ["./openapi/*.yaml"],
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

// Trust proxy for Vercel
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // store: ... , // Use an external store for more precise rate limiting
});
app.use(limiter);

const httpServer = createServer(app);

// Cấu hình Helmet với CSP cho phép CDN
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

const corsOptions: CorsOptions = {
  origin: isProduction ? envConfig.clientUrl : "*",
};
app.use(cors(corsOptions));
const port = envConfig.port;

// Tạo folder upload
initFolder();
app.use(express.json());

// Serve swagger static files
app.use(
  "/api-docs/swagger-ui.css",
  express.static(require.resolve("swagger-ui-dist/swagger-ui.css"))
);
app.use(
  "/api-docs/swagger-ui-bundle.js",
  express.static(require.resolve("swagger-ui-dist/swagger-ui-bundle.js"))
);
app.use(
  "/api-docs/swagger-ui-standalone-preset.js",
  express.static(
    require.resolve("swagger-ui-dist/swagger-ui-standalone-preset.js")
  )
);

app.use("/api-docs", swaggerUi.serve);
app.get(
  "/api-docs",
  swaggerUi.setup(openapiSpecification, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);
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

// Add default route
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// Add health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
