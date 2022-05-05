type TMLanguage = {
  name: string;
  scopeName: string;
  patterns: { include: string }[];
  repository: { [key: string]: Rule };
};

type Rule =
  | { patterns: Rule[] }
  | { include: string }
  | { name: string; match: string }
  | { begin: string; end: string };
