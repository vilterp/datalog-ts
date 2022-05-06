import * as monaco from "monaco-editor";

// adapted from https://github.com/microsoft/vscode/blob/f98ae663913166f38f82b45bec4987a00e77e9b8/src/vs/workbench/api/common/extHostTypes.ts#L2799
// this is built into vscode but not Monaco
// hopefully someday this will be included in Monaco and I can delete this file
export class SemanticTokensBuilder {
  private _prevLine: number;
  private _prevChar: number;
  private _dataIsSortedAndDeltaEncoded: boolean;
  private _data: number[];
  private _dataLen: number;
  private _tokenTypeStrToInt: Map<string, number>;
  private _tokenModifierStrToInt: Map<string, number>;
  private _hasLegend: boolean;

  constructor(legend?: monaco.languages.SemanticTokensLegend) {
    this._prevLine = 0;
    this._prevChar = 0;
    this._dataIsSortedAndDeltaEncoded = true;
    this._data = [];
    this._dataLen = 0;
    this._tokenTypeStrToInt = new Map<string, number>();
    this._tokenModifierStrToInt = new Map<string, number>();
    this._hasLegend = false;
    if (legend) {
      this._hasLegend = true;
      for (let i = 0, len = legend.tokenTypes.length; i < len; i++) {
        this._tokenTypeStrToInt.set(legend.tokenTypes[i], i);
      }
      for (let i = 0, len = legend.tokenModifiers.length; i < len; i++) {
        this._tokenModifierStrToInt.set(legend.tokenModifiers[i], i);
      }
    }
  }

  push(
    range: monaco.Range,
    tokenType: string,
    tokenModifiers?: string[]
  ): void {
    if (!this._hasLegend) {
      throw new Error("Legend must be provided in constructor");
    }
    if (range.startLineNumber !== range.endLineNumber) {
      throw new Error("`range` cannot span multiple lines");
    }
    if (!this._tokenTypeStrToInt.has(tokenType)) {
      throw new Error("`tokenType` is not in the provided legend");
    }
    const line = range.startLineNumber;
    const char = range.startColumn;
    const length = range.endColumn - range.startColumn;
    const nTokenType = this._tokenTypeStrToInt.get(tokenType)!;
    let nTokenModifiers = 0;
    if (tokenModifiers) {
      for (const tokenModifier of tokenModifiers) {
        if (!this._tokenModifierStrToInt.has(tokenModifier)) {
          throw new Error("`tokenModifier` is not in the provided legend");
        }
        const nTokenModifier = this._tokenModifierStrToInt.get(tokenModifier)!;
        nTokenModifiers |= (1 << nTokenModifier) >>> 0;
      }
    }
    this._pushEncoded(line, char, length, nTokenType, nTokenModifiers);
  }

  private _pushEncoded(
    line: number,
    char: number,
    length: number,
    tokenType: number,
    tokenModifiers: number
  ): void {
    if (
      this._dataIsSortedAndDeltaEncoded &&
      (line < this._prevLine ||
        (line === this._prevLine && char < this._prevChar))
    ) {
      // push calls were ordered and are no longer ordered
      this._dataIsSortedAndDeltaEncoded = false;

      // Remove delta encoding from data
      const tokenCount = (this._data.length / 5) | 0;
      let prevLine = 0;
      let prevChar = 0;
      for (let i = 0; i < tokenCount; i++) {
        let line = this._data[5 * i];
        let char = this._data[5 * i + 1];

        if (line === 0) {
          // on the same line as previous token
          line = prevLine;
          char += prevChar;
        } else {
          // on a different line than previous token
          line += prevLine;
        }

        this._data[5 * i] = line;
        this._data[5 * i + 1] = char;

        prevLine = line;
        prevChar = char;
      }
    }

    let pushLine = line;
    let pushChar = char;
    if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
      pushLine -= this._prevLine;
      if (pushLine === 0) {
        pushChar -= this._prevChar;
      }
    }

    this._data[this._dataLen++] = pushLine;
    this._data[this._dataLen++] = pushChar;
    this._data[this._dataLen++] = length;
    this._data[this._dataLen++] = tokenType;
    this._data[this._dataLen++] = tokenModifiers;

    this._prevLine = line;
    this._prevChar = char;
  }

  private static _sortAndDeltaEncode(data: number[]): Uint32Array {
    let pos: number[] = [];
    const tokenCount = (data.length / 5) | 0;
    for (let i = 0; i < tokenCount; i++) {
      pos[i] = i;
    }
    pos.sort((a, b) => {
      const aLine = data[5 * a];
      const bLine = data[5 * b];
      if (aLine === bLine) {
        const aChar = data[5 * a + 1];
        const bChar = data[5 * b + 1];
        return aChar - bChar;
      }
      return aLine - bLine;
    });
    const result = new Uint32Array(data.length);
    let prevLine = 0;
    let prevChar = 0;
    for (let i = 0; i < tokenCount; i++) {
      const srcOffset = 5 * pos[i];
      const line = data[srcOffset + 0];
      const char = data[srcOffset + 1];
      const length = data[srcOffset + 2];
      const tokenType = data[srcOffset + 3];
      const tokenModifiers = data[srcOffset + 4];

      const pushLine = line - prevLine;
      const pushChar = pushLine === 0 ? char - prevChar : char;

      const dstOffset = 5 * i;
      result[dstOffset + 0] = pushLine;
      result[dstOffset + 1] = pushChar;
      result[dstOffset + 2] = length;
      result[dstOffset + 3] = tokenType;
      result[dstOffset + 4] = tokenModifiers;

      prevLine = line;
      prevChar = char;
    }

    return result;
  }

  public build(resultId?: string): monaco.languages.SemanticTokens {
    if (!this._dataIsSortedAndDeltaEncoded) {
      return {
        data: SemanticTokensBuilder._sortAndDeltaEncode(this._data),
        resultId,
      };
    }
    return { data: new Uint32Array(this._data), resultId };
  }
}
