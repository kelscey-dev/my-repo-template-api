import dotenv from "dotenv";

import prisma from "@database";

dotenv.config();
async function main() {
  await prisma.users.registerAdminAccount({
    first_name: "Kelscey",
    last_name: "Ortiz",
    email: `kelscey90@gmail.com`,
    password: "kelscey90@gmail.com",
    role: "superadmin",
  });

  await prisma.users.registerAdminAccount({
    first_name: "Haydee",
    last_name: "Ortiz",
    email: `hadesburn23@gmail.com`,
    password: "hadesburn23@gmail.com",
    role: "superadmin",
  });

  await prisma.users.registerAdminAccount({
    first_name: "Mary Ann",
    last_name: "Ortiz",
    email: `ortiz.meann@gmail.com`,
    password: "ortiz.meann@gmail.com",
    role: "superadmin",
  });
}

main()
  .catch((e) => {
    console.log(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect;
  });
