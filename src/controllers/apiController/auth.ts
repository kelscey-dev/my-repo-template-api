import { hash, genSaltSync, compare } from "bcrypt";
import express, { Request, Response, NextFunction } from "express";

import passport from "passport";

import prisma from "@database";

import {
  AdminChangePasswordValidator,
  AdminInputValidator,
} from "@database/validators/AdminValidators";
import { Authenticate, RoleChecker } from "@middleware/authMiddleware";
import { validateData } from "@middleware/dataValidator";
import { Prisma } from "@prisma/client";
import ErrorHandler, {
  CustomError,
  CustomSuccess,
} from "@utils/responseHandler";

let router = express.Router();

router.get("/me", Authenticate, async (req: Request, res: Response) => {
  try {
    const profile = req.user as Prisma.CredentialsGetPayload<{
      select: {
        last_change_password_at: true;
        last_login_at: true;
        user: {
          select: {
            first_name: true;
            middle_name: true;
            last_name: true;
            full_name: true;
            email: true;
            // custom_id: true;
            role: true;
          };
        };
      };
    }>;

    return CustomSuccess(
      {
        title: "Success",
        content: `You're authenticated`,
        payload: profile,
      },
      req,
      res
    );
  } catch (err) {
    ErrorHandler(err, req, res);
  } finally {
    await prisma.$disconnect();
  }
});

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.isAuthenticated()) {
        throw CustomError({
          title: "Something went wrong",
          statusCode: 401,
          content: "You're still logged in",
          payload: {
            cookies: req.cookies,
            headers: req.headers,
          },
        });
      }
      passport.authenticate(
        "local",
        async (err: any, credential_id: string, info: any) => {
          req.login(credential_id, async (loginErr) => {
            try {
              if (err) {
                throw err;
              }

              if (loginErr) {
                throw loginErr;
              }

              await prisma.credentials.update({
                where: {
                  credential_id,
                },
                data: {
                  last_login_at: new Date(),
                },
              });

              const credential = await prisma.credentials
                .findUniqueOrThrow({
                  where: {
                    credential_id,
                  },
                  select: {
                    user: {
                      select: {
                        full_name: true,
                        role: true,
                      },
                    },
                  },
                })
                .catch(() => {
                  throw CustomError({
                    title: "Oooops!",
                    statusCode: 401,
                    content: `Something went wrong while fetching user information. Kindly contact an admin`,
                  });
                });

              return CustomSuccess(
                {
                  title: "Login Successful",
                  content: `Welcome ${credential.user.full_name}, let's get started!`,
                  payload: {
                    role: credential.user.role,
                  },
                },
                req,
                res
              );
            } catch (err) {
              return ErrorHandler(err, req, res);
            }
          });
        }
      )(req, res, next);
    } catch (err) {
      ErrorHandler(err, req, res);
    }
  }
);

router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = req.user as Prisma.CredentialsGetPayload<{
        include: {
          user: true;
        };
      }>;

      if (!req.isAuthenticated()) {
        throw CustomError({
          title: "Ooops!",
          statusCode: 401,
          content: `You're already logged out.`,
        });
      }

      req.logOut((err) => {
        if (err) {
          throw CustomError({
            title: "Something Went Wrong",
            statusCode: 401,
            content: err,
          });
        }

        req.session.destroy((err) => {
          if (err) {
            throw CustomError({
              title: "Something Went Wrong",
              statusCode: 401,
              content: err,
            });
          }

          res.clearCookie("connect.sid");

          return CustomSuccess(
            {
              title: `Hey ${profile?.user.full_name}!`,
              content: `You have been logged out. See you soon!`,
            },
            req,
            res
          );
        });
      });
    } catch (err) {
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.post(
  "/register",
  RoleChecker(["superadmin", "admin"]),
  validateData(AdminInputValidator),
  async (req: Request, res: Response) => {
    try {
      const newUser = await prisma.users.registerAdminAccount(req.body);

      return CustomSuccess(
        {
          title: "Account Created!",
          content: `Your account has been created`,
          payload: newUser,
        },
        req,
        res
      );
    } catch (err) {
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

router.put(
  "/change-password",
  RoleChecker(["superadmin", "admin"]),
  validateData(AdminChangePasswordValidator),
  async (req: Request, res: Response) => {
    try {
      const profile = req.user as Prisma.CredentialsGetPayload<{
        select: {
          user_id: true;
        };
      }>;

      const salt = genSaltSync(10);

      const user = await prisma.credentials
        .findUniqueOrThrow({
          where: { user_id: profile.user_id },
        })
        .catch(() => {
          throw CustomError({
            title: "Ooops!",
            statusCode: 401,
            content: `Something went wrong while fetching user information. Kindly contact an admin`,
          });
        });

      let newPassword = await hash(req.body.new_password, salt);

      delete req.body.new_password;
      delete req.body.confirm_password;

      const updatedCredential = await prisma.credentials.update({
        where: { user_id: user.user_id },
        data: {
          password: newPassword,
          last_change_password_at: new Date(),
        },
      });

      return CustomSuccess(
        {
          title: "Password Changed!",
          content: `Your password has been updated`,
          payload: updatedCredential,
        },
        req,
        res
      );
    } catch (err) {
      ErrorHandler(err, req, res);
    } finally {
      await prisma.$disconnect();
    }
  }
);

export default router;
