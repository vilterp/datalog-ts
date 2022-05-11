import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { rec } from "../../core/types";
import { mapObj } from "../../util/util";
import { LOADER } from "../commonDL";
import { constructInterp } from "../interp";
import { LanguageSpec } from "../languages";

export type State = {
  registeredLanguages: { [id: string]: LanguageSpec };
  files: {
    [documentURI: string]: {
      interp: AbstractInterpreter;
      source: string;
      langSpec: LanguageSpec;
    };
  };
};

export const initialState: State = { files: {}, registeredLanguages: {} };

export type Action =
  | {
      type: "CreateDoc";
      uri: string;
      initSource: string;
      langSpec: LanguageSpec;
    }
  | {
      type: "EditDoc";
      uri: string;
      newSource: string;
      // TODO: diff events
    }
  | { type: "EditLang"; newLangSpec: LanguageSpec }
  | { type: "CreateLang"; newLangSpec: LanguageSpec };

export type Effect =
  | { type: "RegisterLangInEditor"; langSpec: LanguageSpec }
  | { type: "UpdateLangInEditor"; langSpec: LanguageSpec };

export function update(state: State, action: Action): State {
  switch (action.type) {
    case "EditDoc": {
      const current = state[action.uri];
      const res = constructInterp(
        INIT_INTERP,
        current.langSpec,
        action.newSource
      );
      // TODO: something with errors from constructing interp
      // TODO: process incremental updates. lol
      return {
        ...state,
        files: {
          ...state.files,
          [action.uri]: {
            ...current,
            interp: res.interp,
            source: action.newSource,
          },
        },
      };
    }
    case "EditLang": {
      // TODO: register new lang with Monaco
      return {
        ...state,
        files: mapObj(state.files, (docURI, docState) => {
          const newInterp = constructInterp(
            INIT_INTERP,
            action.newLangSpec,
            docState.source
          );
          return {
            interp: newInterp.interp,
            langSpec: action.newLangSpec,
            source: docState.source,
          };
        }),
      };
    }
    case "CreateDoc":
      return {
        ...state,
        files: {
          ...state.files,
          [action.uri]: {
            langSpec: action.langSpec,
            source: action.initSource,
            interp: constructInterp(
              INIT_INTERP,
              action.langSpec,
              action.initSource
            ).interp,
          },
        },
      };
    case "CreateLang":
      return {
        ...state,
        registeredLanguages: { [action.newLangSpec.name]: action.newLangSpec },
      };
  }
}

export type InterpAndSource = { interp: AbstractInterpreter; source: string };

export function assertMatching(
  interpAndSource: InterpAndSource,
  source: string
) {
  if (source !== interpAndSource.source) {
    // TODO: throw?
    console.error("not matching:", {
      source,
      givenSource: interpAndSource.source,
    });
  }
}

// needs to match highlight.dl
// needs to match https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-classification
export const TOKEN_TYPES = [
  "number",
  "string",
  "keyword",
  "comment",
  "variable",
  "typeParameter",
];

export const INIT_INTERP = new SimpleInterpreter(".", LOADER);

// TODO: parameterize by language
export const GLOBAL_SCOPE = rec("global", {});
