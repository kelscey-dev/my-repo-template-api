import { compare } from "bcrypt";
import NodeCache from "node-cache";
import { PassportStatic } from "passport";

import { Strategy } from "passport-local";
import prisma from "@database";
import { CustomError } from "@utils/responseHandler";

const userCache = new NodeCache({ stdTTL: 600 });

export default async function PassportStrategy(passport: PassportStatic) {
  passport.use(
    new Strategy(async (username, password, done) => {
      try {
        const credential = await prisma.credentials
          .findFirstOrThrow({
            where: {
              user: {
                email: username,
              },
            },
            select: {
              credential_id: true,
              password: true,
            },
          })
          .catch(() => {
            throw CustomError({
              title: "Oooops!",
              statusCode: 401,
              content: "Your account or password is incorrect.",
            });
          });

        await compare(password, credential.password).then((isSame) => {
          if (!isSame) {
            throw CustomError({
              title: "Oooops!",
              statusCode: 401,
              content: "Your account or password is incorrect.",
            });
          }

          const { credential_id } = credential;

          return done(null, credential_id);
        });
      } catch (err: any) {
        return done(err, false);
      }
    })
  );

  passport.serializeUser((credential_id, done) => {
    try {
      if (!credential_id) {
        throw CustomError({
          title: "Oooops!",
          statusCode: 401,
          content: "Something went wrong with the session",
        });
      }
      done(null, credential_id);
    } catch (err) {
      return done(err);
    }
  });

  passport.deserializeUser(async (credential_id: string, done) => {
    try {
      const cachedProfile = userCache.get(credential_id.toString());
      if (cachedProfile) {
        return done(null, cachedProfile);
      }
      const profile = await prisma.credentials
        .findUniqueOrThrow({
          where: {
            credential_id,
          },
          select: {
            user: true,
            last_change_password_at: true,
            last_login_at: true,
            user_id: true,
          },
        })
        .catch(() => {
          throw CustomError({
            title: "Oooops!",
            statusCode: 401,
            content: `Something went wrong while fetching user information. Kindly contact an admin`,
          });
        });

      userCache.set(credential_id.toString(), profile);

      return done(null, profile);
    } catch (err) {
      return done(err);
    }
  });
}
