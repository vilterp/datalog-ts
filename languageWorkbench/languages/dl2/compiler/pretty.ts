import { TableDecl, TableMember } from "./types";

export function prettyPrintTableDecl(name: string, decl: TableDecl): string {
  return [
    `table ${name} {`,
    Object.entries(decl.members)
      .map(([name, member]) => "  " + prettyPrintTableMember(name, member))
      .join(",\n"),
    "}",
  ].join("\n");
}

function prettyPrintTableMember(name: string, member: TableMember): string {
  switch (member.type) {
    case "Scalar":
      return name;
    case "InRef":
      return `${name}: inRef(${member.table}:${member.column})`;
    case "OutRef":
      return `${name} outRef(${member.table}:${member.column})`;
  }
}
