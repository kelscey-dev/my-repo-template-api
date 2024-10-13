import dotenv from "dotenv";
import { Express } from "express";

let config = (app: Express) => {
  dotenv.config();
  app.set("view engine", "ejs");
  app.set("views", "./src/webview/views");
  app.set("json spaces", 2);
};

export default config;
