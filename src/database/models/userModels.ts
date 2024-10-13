import { genSaltSync, hash } from "bcrypt";

import { generateFullName, generateRandomPassword } from "@utils/prismaHelpers";


import prisma from "..";


export async function registerUserAccount(data: any): Promise<any> {
  try {
    data.full_name = generateFullName({
      firstName: data.first_name,
      middleName: data.middle_name,
      lastName: data.last_name,
    });

    let generatedPassword = data.password ?? generateRandomPassword(12);
    let hashedPassword = await hash(
      data.password ?? generatedPassword,
      genSaltSync(10)
    );

    delete data.password;
    delete data.line;

    let transaction = await prisma.$transaction(async (tx) => {
      let newUserAccount = await tx.users.create({
        data: {
          ...data,
          credentials: {
            create: {
              password: hashedPassword,
            },
          },
        },
      });

      await tx.userIdSeq.create({
        data: {
          user_id: newUserAccount.user_id,
        },
      });

      return newUserAccount;
    });

    return { user: transaction };
  } catch (err) {
    throw err;
  }
}

export async function registerAdminAccount(data: any): Promise<any> {
  try {
    data.full_name = generateFullName({
      firstName: data.first_name,
      middleName: data.middle_name,
      lastName: data.last_name,
    });

    let generatedPassword = generateRandomPassword(12);
    let hashedPassword = await hash(
      data.password ?? generatedPassword,
      genSaltSync(10)
    );

    delete data.password;

    let transaction = await prisma.$transaction(async (tx) => {
      let newAdminAccount = await tx.users.create({
        data: {
          ...data,
          credentials: {
            create: {
              password: hashedPassword,
            },
          },
        },
      });

      await tx.adminIdSeq.create({
        data: {
          user_id: newAdminAccount.user_id,
        },
      });

      return newAdminAccount;
    });

    return {
      user: transaction,
    };
  } catch (err) {
    throw err;
  }
}
