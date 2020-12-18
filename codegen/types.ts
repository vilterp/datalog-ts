export type Res = { rec: Rec; bindings: Map<string, Term> };

export type Term = string | Rec;

export type Rec = { relation: string; attrs: { [key: string]: Term } };

export type NodeID = string;

export type Insertion = { origin: NodeID; destination: NodeID; res: Res };
