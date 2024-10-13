import { ActionTypes, Prisma } from "@prisma/client";

export type TargetTableIdType = Exclude<
  Prisma.ActivityLogsRelationsOrderByRelevanceFieldEnum,
  "activity_logs_relations_id" | "activity_logs_id"
>;

export type ActivityLogsTypes =
  | {
      logStatus: "success";
      targetTable: { key: TargetTableIdType; value: string };
      logActionType: ActionTypes;
      updatedFields: DiffResult[];
      error?: never;
    }
  | {
      logStatus: "failed";
      targetTable?: { key: TargetTableIdType; value: string };
      logActionType: ActionTypes;
      updatedFields?: never;
      error: string;
    };

export type DiffResult = {
  key: string;
  currentValue: any;
  previousValue: any;
};
