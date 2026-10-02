import type { Effect } from "../../ruleBuilder/types";
import type { EffectReturn } from "../lib/effectUtils";
import { EDITIONS, RANKS, SEALS } from "../../data/BalatroUtils";

export const generateCreatePlayingCardEffectCode = (
  effect: Effect,
  itemType: string,
  triggerType: string,
  modprefix: string,
): EffectReturn => {
  switch (itemType) {
    case "joker":
      return generateJokerCode(effect, triggerType, modprefix);
    default:
      return {
        statement: "",
        colour: "G.C.WHITE",
      };
  }
};

const generateJokerCode = (
  effect: Effect,
  triggerType: string,
  modprefix: string,
): EffectReturn => {
  const suit = effect.params?.suit;
  const rank = effect.params?.rank;
  const enhancement = effect.params?.enhancement;
  const seal = effect.params?.seal;
  const edition = effect.params?.edition;
  const location = (effect.params?.location?.value as string) || "deck";

  const customMessage = effect.customMessage;

  const scoringTriggers = ["hand_played", "card_scored"];
  const heldInHandTriggers = ["card_held_in_hand"];

  const isScoring = scoringTriggers.includes(triggerType);
  const isHeldInHand = heldInHandTriggers.includes(triggerType);

  let cardSelectionCode = "";

  if (suit.value === "random" && rank.value === "random") {
    cardSelectionCode =
      "local card_front = pseudorandom_element(G.P_CARDS, pseudoseed('add_card_hand'))";
  } else {
    if (suit.valueType === "user_var") {
      cardSelectionCode += `
        local suit_prefix = SMODS.Suits[G.GAME.current_round.${suit.value}_card.suit].card_key`;
    } else if (suit.value === "random") {
      cardSelectionCode += `
        local suit_prefix = pseudorandom_element(SMODS.Suits, pseudoseed('add_card_hand_suit')).card_key`;
    } else {
      cardSelectionCode += `
        local suit_prefix = SMODS.Suits['${suit.value}'].card_key`;
    }

    if (rank.valueType === "user_var") {
      cardSelectionCode += `
        local rank_value = G.GAME.current_round.${rank.value}_card.rank or G.GAME.current_round.${rank.value}_card.id
        local selected_rank = SMODS.Ranks[rank_value]
        if not selected_rank then
            for _, rank_key in ipairs(SMODS.Rank.obj_buffer) do
                local candidate = SMODS.Ranks[rank_key]
                if candidate.card_key == rank_value or candidate.id == rank_value then
                    selected_rank = candidate
                    break
                end
            end
        end
        local rank_suffix = selected_rank.card_key`;
    } else if (rank.value === "random") {
      cardSelectionCode += `
        local rank_suffix = pseudorandom_element(SMODS.Ranks, pseudoseed('add_card_hand_rank')).card_key`;
    } else {
      const rankName =
        RANKS.find(
          (entry) => entry.value === rank.value || entry.label === rank.value,
        )?.label || rank.value;
      cardSelectionCode += `
        local rank_suffix = SMODS.Ranks['${rankName}'].card_key`;
    }

    cardSelectionCode += `
      local card_front = G.P_CARDS[suit_prefix..'_'..rank_suffix]`;
  }

  let centerParam = "";
  if (enhancement.value === "none") {
    centerParam = `G.P_CENTERS.c_base`;
  } else if (enhancement.value === "random") {
    centerParam = `pseudorandom_element({G.P_CENTERS.m_gold, G.P_CENTERS.m_steel, G.P_CENTERS.m_glass, G.P_CENTERS.m_wild, G.P_CENTERS.m_mult, G.P_CENTERS.m_lucky, G.P_CENTERS.m_stone}, pseudoseed('add_card_hand_enhancement'))`;
  } else if (enhancement.valueType === "user_var") {
    centerParam = `G.P_CENTERS[card.ability.extra.${enhancement.value}]`;
  } else {
    centerParam = `G.P_CENTERS.${enhancement.value}`;
  }

  let sealCode = "";
  if (seal.value === "random") {
    const sealPool = SEALS().map((seal) => `'${seal.value}'`);
    sealCode = `
      new_card:set_seal(pseudorandom_element({${sealPool}}, pseudoseed('add_card_hand_seal')), true)`;
  } else if (seal.valueType === "user_var") {
    sealCode = `
      new_card:set_seal(card.ability.extra.${seal.value}, true)`;
  } else if (seal.value !== "none") {
    sealCode = `
      new_card:set_seal("${seal.value}", true)`;
  }

  let editionCode = "";
  if (edition.value === "random") {
    const editionPool = EDITIONS().map(
      (edition) =>
        `'${edition.key.startsWith("e_") ? edition.key : `e_${modprefix}_${edition.key}`}'`,
    );
    editionCode = `
      new_card:set_edition(pseudorandom_element({${editionPool}}, pseudoseed('add_card_hand_edition')), true)`;
  } else if (edition.valueType === "user_var") {
    editionCode = `
      new_card:set_edition(card.ability.extra.${edition.value}, true)`;
  } else if (edition.value !== "none") {
    editionCode = `
      new_card:set_edition("${(edition.value as string).startsWith("e_") ? edition.value : `e_${edition.value}`}", true)`;
  }

  if (location !== "deck" && location !== "hand") {
    return { statement: "", colour: "G.C.GREEN" };
  }

  const targetArea = location === "hand" ? "G.hand" : "G.deck";
  // The helper registers the card; defer emplacement to avoid changing a hand
  // while its held-card effects are being calculated.
  const createCardCode = `
      ${cardSelectionCode}
      local new_card = create_playing_card({
          front = card_front,
          center = ${centerParam}
      }, ${targetArea}, true, false, nil, true)
      ${sealCode}
      ${editionCode}
      G.deck.config.card_limit = G.deck.config.card_limit + 1
      G.E_MANAGER:add_event(Event({
          func = function()
              ${targetArea}:emplace(new_card)
              new_card:start_materialize()
              SMODS.calculate_context({ playing_card_added = true, cards = { new_card } })
              return true
          end
      }))`;

  return {
    statement:
      isScoring || isHeldInHand
        ? `__PRE_RETURN_CODE__${createCardCode}\n__PRE_RETURN_CODE_END__`
        : `func = function()${createCardCode}\nend`,
    message: customMessage
      ? `"${customMessage}"`
      : location === "hand"
        ? '"Added Card to Hand!"'
        : '"Added Card!"',
    colour: "G.C.GREEN",
  };
};
