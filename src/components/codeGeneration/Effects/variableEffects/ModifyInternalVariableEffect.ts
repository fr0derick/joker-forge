import type { Effect } from "../../../ruleBuilder/types";
import type { EffectReturn } from "../../lib/effectUtils";
import { generateValueCode, getCardExtraPath } from "../../lib/gameVariableUtils";

export const generateModifyInternalVariableEffectCode = (
  effect: Effect,
  itemType: string,
  triggerType: string, 
): EffectReturn => {
  const variableName = (effect.params?.variable_name?.value as string) || "var1";
  const operation = (effect.params?.operation?.value as string) || "increment";
  const indexMethod = (effect.params?.index_method?.value as string) || "self"

  const valueCode = generateValueCode(effect.params?.value, itemType)
  const abilityPath = getCardExtraPath(itemType);

  const customMessage = effect.customMessage;

  const searchKey = (effect.params?.joker_key.value as string) || "j_joker"
  const searchVar = (effect.params?.joker_variable?.value as string) || "jokerVar"

  const scoringTriggers = ["hand_played", "card_scored"];
  const isScoring = scoringTriggers.includes(triggerType);

  let operationCode = "";
  const messageText = customMessage ? `"${customMessage}"` : undefined;
  let messageColor = "G.C.WHITE";

  switch (operation) {
    case "set":
      operationCode = `${abilityPath}.${variableName} = ${valueCode}`;
      messageColor = "G.C.BLUE";
      break;
    case "increment":
      operationCode = `${abilityPath}.${variableName} = (${abilityPath}.${variableName}) + ${valueCode}`;
      messageColor = "G.C.GREEN";
      break;
    case "decrement":
      operationCode = `${abilityPath}.${variableName} = math.max(0, (${abilityPath}.${variableName}) - ${valueCode})`;
      messageColor = "G.C.RED";
      break;
    case "multiply":
      operationCode = `${abilityPath}.${variableName} = (${abilityPath}.${variableName}) * ${valueCode}`;
      messageColor = "G.C.MULT";
      break;
    case "divide":
      operationCode = `${abilityPath}.${variableName} = (${abilityPath}.${variableName}) / ${valueCode}`;
      messageColor = "G.C.MULT";
      break;
    case "power":
      operationCode = `${abilityPath}.${variableName} = (${abilityPath}.${variableName}) ^ ${valueCode}`;
      messageColor = "G.C.BLUE";
      break;
    case "absolute":
      operationCode = `${abilityPath}.${variableName} = math.abs(${abilityPath}.${variableName})`;
      messageColor = "G.C.BLUE";
      break;
    case "natural_log":
      operationCode = `${abilityPath}.${variableName} = math.log(${abilityPath}.${variableName})`;
      messageColor = "G.C.BLUE";
      break;
    case "log10":
      operationCode = `${abilityPath}.${variableName} = math.log10(${abilityPath}.${variableName})`;
      messageColor = "G.C.BLUE";
      break;
    case "square_root":
      operationCode = `${abilityPath}.${variableName} = math.sqrt(${abilityPath}.${variableName})`;
      messageColor = "G.C.BLUE";
      break;
    case "ceil":
      operationCode = `${abilityPath}.${variableName} = math.ceil(${abilityPath}.${variableName})`;
      messageColor = "G.C.BLUE";
      break;
    case "floor":
      operationCode = `${abilityPath}.${variableName} = math.floor(${abilityPath}.${variableName})`;
      messageColor = "G.C.BLUE";
      break;
    case "index":
      switch (indexMethod) {
        case "self":
          operationCode = `
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i] == card then
                ${abilityPath}.${variableName} = i
                break
            end
        end`;
          break
        case "random":
          operationCode = `${abilityPath}.${variableName} = math.random(1, #G.jokers.cards)`
          break
        case "first":
          operationCode = `${abilityPath}.${variableName} = 1`
          break
        case "last":
          operationCode = `${abilityPath}.${variableName} = #G.jokers.cards`
          break
        case "left":
          operationCode = `local my_pos = nil
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i] == card then
                my_pos = i
                break
            end
        end
        ${abilityPath}.${variableName} = math.max(my_pos - 1, 0)
        `
          break
        case "right":
          operationCode = `local my_pos = nil
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i] == card then
                my_pos = i
                break
            end
        end
        if my_pos > #G.jokers.cards then 
          my_pos = -1
        end
        ${abilityPath}.${variableName} = my_pos + 1
        `
          break
        case "key":
          operationCode = `local search_key = '${searchKey}'
          ${abilityPath}.${variableName} = 0
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i].config.center.key == search_key then
                ${abilityPath}.${variableName} = i
                break
            end
          end`
          break
        case "variable":
          operationCode = `local search_key = ${abilityPath}.${searchVar}
          ${abilityPath}.${variableName} = 0
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i].config.center.key == search_key then
                ${abilityPath}.${variableName} = i
                break
            end
          end`
          break
        case "selected_joker":
          operationCode = `
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i] == G.jokers.highlighted[1] then
                ${abilityPath}.${variableName}= i
                break
            end
        end`
          break
        case "evaled_joker":
          operationCode = `
          for i = 1, #G.jokers.cards do
            if G.jokers.cards[i] == context.other_joker then
                ${abilityPath}.${variableName}= i
                break
            end
        end`
          break
      }
    break
    default:
      operationCode = `${abilityPath}.${variableName} = (${abilityPath}.${variableName}) + ${valueCode}`;
      messageColor = "G.C.GREEN";
  }

  if (isScoring) {
    return {
      statement: `__PRE_RETURN_CODE__
                ${operationCode}
                __PRE_RETURN_CODE_END__`,
      message: messageText,
      colour: messageColor,
    };
  } else {
    return {
      statement: `func = function()
                    ${operationCode}
                    return true
                end`,
      message: messageText,
      colour: messageColor,
    };
  }
};
