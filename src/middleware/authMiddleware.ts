import { Response, Request, NextFunction } from "express";
import { Prisma, UserRoles } from "@prisma/client";
import { CustomError } from "@utils/responseHandler";

export function Authenticate(req: Request, res: Response, next: NextFunction) {
  const session: any = req.session;
  try {
    if (req.isUnauthenticated()) {
      return res.status(401).send(
        CustomError({
          title: "Unauthorized",
          statusCode: 401,
          content: "You're not authorized to access this page.",
          payload: {
            notAuth: true,
            node: process.env.NODE_ENV,
            session: session,
            cookies: req.cookies,
            headers: req.headers,
          },
        })
      );
    }

    //   req.session.regenerate();
    next();
  } catch (err) {
    throw err;
  }
}

export function ApiKeyChecker(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.headers["x-api-key"] !== process.env.NODE_APP_API_KEY) {
      return res.status(401).send(
        CustomError({
          title: "Unauthorized",
          statusCode: 401,
          content: "Permission denied",
        })
      );
    }

    next();
  } catch (err) {
    throw err;
  }
}

export function RoleChecker(roles: UserRoles[]) {
  try {
    return async (req: Request, res: Response, next: NextFunction) => {
      console.log(req.headers);
      Authenticate(req, res, async () => {
        const profile = req.user as Prisma.CredentialsGetPayload<{
          include: {
            user: true;
          };
        }>;
        if (profile) {
          if (roles.includes(profile.user.role as UserRoles)) {
            return next();
          }
        }

        return res.status(401).send(
          CustomError({
            title: "Unauthorized",
            statusCode: 401,
            content: "You need more permission",
          })
        );
      });
    };
  } catch (err) {
    throw err;
  }
}
