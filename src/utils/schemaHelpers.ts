import { ZodEffects, ZodNumber, ZodString, z } from "zod";

type zodStringTypes = "email" | "mobile_number" | "date";

export function stringTypeZod<T extends zodStringTypes | undefined>(
  fieldLabel: string,
  options?: {
    rejectSpecialCharacters?: T extends zodStringTypes ? never : boolean;
    rejectNumberCharacters?: T extends zodStringTypes ? never : boolean;
    rejectLeadingSpace?: T extends "date" ? never : boolean;
    rejectMinCharacters?: T extends "date"
      ? never
      : {
          min: number;
          customMessage?: string;
        };
    rejectMaxCharacters?: T extends "date"
      ? never
      : {
          max: number;
          customMessage?: string;
        };
    type?: T;
  }
) {
  let validationSchema: ZodString | ZodEffects<ZodString, string, string> =
    z.string();

  if (options) {
    const {
      rejectSpecialCharacters,
      rejectLeadingSpace,
      rejectNumberCharacters,
      rejectMinCharacters,
      rejectMaxCharacters,
      type,
    } = options;
    if (type === "email") {
      validationSchema = validationSchema.email(`${fieldLabel} must be valid`);
    }

    if (type === "mobile_number") {
      validationSchema = validationSchema.regex(/^(09|\+639)\d{9}$/, {
        message: `${fieldLabel} must be valid`,
      });
    }

    if (rejectSpecialCharacters) {
      validationSchema = validationSchema.regex(/^[a-zA-Z0-9 ]*$/, {
        message: `${fieldLabel} cannot contain special characters`,
      });
    }

    if (rejectNumberCharacters) {
      validationSchema = validationSchema.regex(/^[^\d]*$/, {
        message: `${fieldLabel} cannot contain numbers`,
      });
    }

    if (rejectMinCharacters) {
      validationSchema = validationSchema.min(rejectMinCharacters.min, {
        message: rejectMinCharacters.customMessage
          ? rejectMinCharacters.customMessage
          : `${fieldLabel} must be at least ${rejectMinCharacters.min} characters long`,
      });
    }

    if (rejectMaxCharacters && rejectMaxCharacters.max) {
      validationSchema = validationSchema.max(rejectMaxCharacters.max, {
        message: rejectMaxCharacters.customMessage
          ? rejectMaxCharacters.customMessage
          : `${fieldLabel} must be at most ${rejectMaxCharacters.max} characters long`,
      });
    }

    if (rejectLeadingSpace) {
      validationSchema = validationSchema.refine((value) => value[0] !== " ", {
        message: `${fieldLabel} cannot start with a space`,
      });
    }
  }

  return validationSchema;
}

export function numberTypeZod(
  fieldLabel: string,
  options?: {
    rejectLeadingZero?: boolean;
    rejectMin?: {
      min: number;
      customMessage?: string;
    };
    rejectMax?: {
      max: number;
      customMessage?: string;
    };
  }
): ZodNumber {
  let validationSchema: ZodNumber = z.number();

  if (options) {
    const { rejectLeadingZero, rejectMin, rejectMax } = options;

    if (rejectMin) {
      validationSchema = validationSchema.gte(rejectMin.min, {
        message: rejectMin.customMessage
          ? rejectMin.customMessage
          : `${fieldLabel} must be greater than ${rejectMin.min}`,
      });
    }

    if (rejectMax && rejectMax.max) {
      validationSchema = validationSchema.lte(rejectMax.max, {
        message: rejectMax.customMessage
          ? rejectMax.customMessage
          : `${fieldLabel} must be less than ${rejectMax.max}`,
      });
    }

    // if (rejectLeadingZero) {
    //   validationSchema = validationSchema.refine(
    //     (value) => {
    //       const stringValue = value.toString();

    //       if (stringValue.startsWith("0") && stringValue !== "0") {
    //         return false;
    //       }

    //       return true;
    //     },
    //     {
    //       message: `${fieldLabel} should not have leading zeros`,
    //     }
    //   );
    // }
  }

  return validationSchema;
}
