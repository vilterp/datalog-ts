import Denque from "denque";
import { int, rec, Statement, str } from "../types";

export type InputEvt =
  | { type: "Insert"; index: number; char: string }
  | { type: "Delete"; index: number }; // index of character to be deleted

export class IncrementalInputManager {
  nextID: 0;
  indexToID: Denque<number>;

  constructor() {
    this.nextID = 0;
    this.indexToID = new Denque();
  }

  processEvent(evt: InputEvt): Statement[] {
    switch (evt.type) {
      case "Insert": {
        const newID = this.getNextID();
        const lengthBefore = this.indexToID.length;
        const out: Statement[] = [
          {
            type: "Insert",
            record: rec("source", {
              id: int(newID),
              char: str(evt.char),
            }),
          },
        ];
        if (evt.index > 0) {
          out.push({
            type: "Insert",
            record: rec("next", {
              left: int(this.indexToID.peekAt(evt.index - 1)),
              right: int(newID),
            }),
          });
        }
        if (evt.index < lengthBefore) {
          out.push({
            type: "Insert",
            record: rec("next", {
              left: int(newID),
              right: int(this.indexToID.peekAt(evt.index + 1)),
            }),
          });
        }
        return out;
      }
      case "Delete":
        throw new Error("TODO: deletions");
    }
  }

  private getNextID(): number {
    const newID = this.nextID;
    this.nextID++;
    return newID;
  }
}
