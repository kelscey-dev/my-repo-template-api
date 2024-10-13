import { Request, Response, ErrorRequestHandler } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { keyToTitleCase } from "./helpers";

type CustomError = {
  title: string;
  content: string;
  statusCode: number;
  payload?: any;
};

type CustomSuccess = {
  title: string;
  content: string;
  payload?: any;
};

// type CustomError = {
//   title: string;
//   content: string;
//   statusCode: number;
// };

function splitMetaTarget(meta: string) {
  let meta_key =
    meta
      ?.split("_")
      .slice(1, -1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") ?? meta;

  return meta_key;
}

export function CustomSuccess(
  data: CustomSuccess,
  req: Request,
  res: Response
) {
  return res.status(200).send(data);
}

export function CustomError(err: CustomError) {
  return { ...err, ok: false };
}

export default function ErrorHandler(err: any, req: Request, res: Response) {
  let statusCode: number;
  let errorTitle: string;
  let metaTarget: any;
  let errorContent: string;
  let errorCode: any;
  let main: any;

  if (err instanceof PrismaClientKnownRequestError) {
    let errorMeta: any = err.meta;

    switch (err.code) {
      case "P1000":
        statusCode = 503;
        errorTitle = "Something Went Wrong";
        metaTarget = errorMeta;
        errorContent = "Failed to connect to the database.";
        errorCode = err.code;
        break;
      case "P1001":
        statusCode = 503;
        errorTitle = "Something Went Wrong";
        metaTarget = errorMeta;
        errorContent = "Timeout occurred while connecting to the database.";
        errorCode = err.code;
        break;
      case "P1002":
        statusCode = 401;
        errorTitle = "Something Went Wrong";
        metaTarget = errorMeta;
        errorContent = "Database authentication failed.";
        errorCode = err.code;
        break;
      case "P2000":
        // Unique constraint violation occurred.
        statusCode = 409;
        errorTitle = "Oh Snap!";
        metaTarget = errorMeta;
        errorContent = `${keyToTitleCase(
          errorMeta.target[0].toString() ?? ""
        )} is already taken`;
        errorCode = err.code;
        break;
      case "P2001":
        // Foreign key constraint violation occurred.
        statusCode = 409;
        errorTitle = "Oh Snap!";
        metaTarget = errorMeta;
        errorContent = `${keyToTitleCase(errorMeta.toString())} is required`;
        errorCode = err.code;
        break;
      case "P2002":
        // Unique constraint violation on an index occurred.
        statusCode = 409;
        errorTitle = "Oh Snap!";
        metaTarget = errorMeta;
        errorContent = `${keyToTitleCase(
          errorMeta.target[0].toString() ?? ""
        )} is already taken`;
        errorCode = err.code;
        break;
      case "P2003":
        // Null constraint violation occurred.
        statusCode = 400;
        errorTitle = "Oh Snap!";
        metaTarget = errorMeta;
        errorContent = `${splitMetaTarget(errorMeta)} is required`;
        errorCode = err.code;
        break;
      case "P2004":
        // Check constraint violation occurred.
        statusCode = 400;
        errorTitle = "Check constraint violation occurred.";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P2005":
        // Data too long for column.
        statusCode = 400;
        errorTitle = "Data too long for column.";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P2006":
        // Invalid input value for column.
        statusCode = 400;
        errorTitle = "Invalid input value";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P2007":
        // Invalid relation for column.
        statusCode = 400;
        errorTitle = "Invalid relation";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P3000":
        // Invalid Prisma schema definition.
        statusCode = 500;
        errorTitle = "Invalid Prisma schema definition.";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P3001":
        // Invalid relation field in the Prisma schema.
        statusCode = 500;
        errorTitle = "Invalid relation field in the Prisma schema.";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P3002":
        // Invalid model name in the Prisma schema.
        statusCode = 500;
        errorTitle = "Invalid model name in the Prisma schema.";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      case "P3003":
        // Invalid enum value in the Prisma schema.
        statusCode = 500;
        errorTitle = "Invalid enum value in the Prisma schema.";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
      default:
        statusCode = 500;
        errorTitle = "Internal server error";
        metaTarget = errorMeta;
        errorContent = err.message;
        errorCode = err.code;
        break;
    }
  } else {
    statusCode = err.statusCode ?? 500;
    errorContent = err.content;
    errorTitle = err?.title ?? "Internal Server Error";
    main = err.message;
  }

  // console.log("ERROR IN RESPONSE HANDLER", main);

  return res.status(statusCode).send({
    ...err,
    title: errorTitle,
    content: errorContent,
    code: errorCode,
    main,
    // meta: Array.isArray(metaTarget) ? metaTarget[0] : metaTarget,
  });
}
