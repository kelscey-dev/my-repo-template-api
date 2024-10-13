import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { CustomError } from "@utils/responseHandler";

export function validateData(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.log(error.issues);
        return res.status(400).send(
          CustomError({
            title: "Ooops!",
            statusCode: 401,
            content: error.issues[0].message,
          })
        );
      }
      return res.status(400).send(
        CustomError({
          title: "Ooops!",
          statusCode: 401,
          content: "Something went wrong in validating data",
        })
      );
      // next(error);
    }
  };
}

export function validateRouteParameters(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error });
      }
      next(error);
    }
  };
}

export function validateQueryParameters(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error });
      }
      next(error);
    }
  };
}
