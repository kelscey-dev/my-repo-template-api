import consola from "consola";
import express from "express";

import { setGlobalOptions, https } from "firebase-functions/v2";
import "module-alias/register";

import config from "@config";
import middleware from "@middleware";

import apiRoutes from "@routes";

setGlobalOptions({
  region: "asia-southeast1",
});

const app = express();

config(app);
middleware(app);
apiRoutes(app);

if (process.env.NODE_ENV !== "production") {
  const port = process.env.NODE_APP_PORT || 8000;

  app.listen(port, () => {
    consola.success({
      message: `APP RUNNING at port: ${port}\n\nDate & Time Initiated: ${new Date()}`,
      badge: true,
    });
  });
}

exports.server = https.onRequest(app);
