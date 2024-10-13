import { Response, Request, NextFunction } from "express";

export default function booleanParser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    Object.keys(req.body).forEach((key) => {
      if (
        typeof req.body[key] === "string" &&
        (req.body[key].toLowerCase() === "true" ||
          req.body[key].toLowerCase() === "false")
      ) {
        req.body[key] = req.body[key].toLowerCase() === "true";
      }
    });
    next();
  } catch (err) {
    throw err;
  }
}
