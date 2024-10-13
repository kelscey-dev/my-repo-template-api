import { ZodTypeAny, z } from "zod";
import { Prisma, UserRoles } from "@prisma/client";
import { stringTypeZod } from "@utils/schemaHelpers";

type OmittedUsersCreateInputKeys =
  | "user_id"
  | "admin_id_seq"
  | "user_id_seq"
  | "credentials"
  | "created_purchase_orders"
  | "batch_orders"
  | "sales"
  | "full_name"
  | "activity_logs"
  | "activity_logs_relations"
  | "created_at"
  | "updated_at";

export const AdminInputValidator = z.object<
  Record<
    keyof Omit<Prisma.UsersCreateArgs["data"], OmittedUsersCreateInputKeys>,
    ZodTypeAny
  >
>({
  first_name: stringTypeZod("First Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
    rejectNumberCharacters: true,
    rejectSpecialCharacters: true,
  }),
  middle_name: z.optional(
    z.nullable(
      stringTypeZod("Middle Name", {
        rejectLeadingSpace: true,
        rejectNumberCharacters: true,
        rejectSpecialCharacters: true,
      })
    )
  ),
  last_name: stringTypeZod("Last Name", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
    rejectNumberCharacters: true,
    rejectSpecialCharacters: true,
  }),
  role: z.enum(Object.values(UserRoles) as [string, ...string[]], {
    message: "Invalid User Role",
  }),
  email: stringTypeZod("Email", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
    type: "email",
  }),
  mobile_no: stringTypeZod("Mobile Number", {
    rejectLeadingSpace: true,
    rejectMinCharacters: {
      min: 1,
    },
    type: "mobile_number",
  }),
});

export const AdminChangePasswordValidator = z
  .object({
    new_password: z.string(),
    confirm_password: z.string(),
  })
  .superRefine(({ new_password, confirm_password }, ctx) => {
    if (confirm_password !== new_password) {
      ctx.addIssue({
        code: "custom",
        message: "Confirm Password does not match ",
        path: ["confirmPassword"],
      });
    }
  });
