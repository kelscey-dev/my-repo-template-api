import bodyParser from "body-parser";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import session from "express-session";
import passport from "passport";
import pgPool from "pg-pool";

import PassportStrategy from "@config/passportConfig";

import { Prisma } from "@prisma/client";

import ErrorHandler from "@utils/responseHandler";

import booleanParser from "./booleanParser";

const pool = new pgPool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const pgSession = connectPgSimple(session);

let middleware = (app: Express) => {
  app.use(
    express.static(
      process.env.NODE_ENV === "production" ? "dist/public" : "public"
    )
  );
  app.use(cookieParser());
  // app.use(bodyParser.json());
  app.use(express.json({ limit: "50mb" }));
  app.use(
    bodyParser.urlencoded({
      limit: "50mb",
      extended: true,
      parameterLimit: 50000,
    })
  );
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        // "http://192.168.1.17:3000",
        "https://jolly-claro.com",
      ],
      credentials: true,
      exposedHeaders: ["Content-Disposition", "Set-Cookie", ""],
    })
  );

  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "private");
    next();
  });

  app.use(
    session({
      store: new pgSession({
        pool: pool,
        tableName: "Session",
        pruneSessionInterval: 60000,
      }),
      secret: `${process.env.NODE_APP_SESSION_SECRET}`,
      resave: false,
      saveUninitialized: false,
      name: "__session",
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: process.env.NODE_ENV === "production",
        sameSite: "none",
        // maxAge: 15 * 60 * 1000,
        domain: process.env.NODE_ENV === "production" ? ".jolly-claro.com" : "",
      },
      // rolling: true,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  PassportStrategy(passport);

  // app.use(booleanParser);
};

export default middleware;
