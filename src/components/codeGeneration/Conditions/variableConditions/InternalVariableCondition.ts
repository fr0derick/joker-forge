import type { Rule } from "../../../ruleBuilder/types";
import { generateValueCode, getCardExtraPath } from "../../lib/gameVariableUtils";
import { generateOperationCode } from "../../lib/operationUtils";

export const generateInternalVariableConditionCode = (
  rules: Rule[],
  itemType: string = "",
): string | null => {
  const condition = rules[0].conditionGroups[0].conditions[0];
  const variableName = (condition.params?.variable_name?.value as string) || "var1";
  const operator = (condition.params?.operator?.value as string) || "equals";
  const value = generateValueCode(condition.params?.value, itemType) || "0";

  return generateOperationCode(
    operator,
    `(${getCardExtraPath(itemType)}.${variableName} or 0)`,
    value,
  )
};
