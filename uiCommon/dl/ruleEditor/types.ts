import { Conjunct } from "../../../core/types";

export type Order = { varName: string; attr: string }[];

export type RuleAction =
  | { type: "EditHead"; action: HeadAction }
  | { type: "EditBody"; action: DisjunctionAction };

export type HeadAction =
  | { type: "EditName"; name: string }
  | {
      type: "EditVar";
      idx: number;
      order: Order;
      newVar: string;
    }
  | {
      type: "EditAttr";
      idx: number;
      order: Order;
      newAttr: string;
    }
  | { type: "DeleteColumn"; order: Order; idx: number };

export type DisjunctionAction =
  | { type: "AddDisjunct" }
  | { type: "RemoveDisjunct"; idx: number }
  | { type: "EditDisjunct"; idx: number; action: ConjunctionAction };

export type ConjunctionAction =
  | { type: "AddConjunct"; conjunct: Conjunct }
  | { type: "RemoveConjunct"; idx: number }
  | {
      type: "EditConjunct";
      conjunctIdx: number;
      varName: string;
      attr: string;
    };
