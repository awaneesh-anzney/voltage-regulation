import { SCInputs } from "../src/lib/types/scForcesTypes";

export type ValidationStatus = "EXTERNAL_PDF_MATCH" | "REGRESSION_ONLY";

export interface GoldenCase {
  name: string;
  validationStatus: ValidationStatus;
  description: string;
  inputOverrides: Partial<SCInputs>;
  expected: Record<string, number | boolean | string | null>;
}
