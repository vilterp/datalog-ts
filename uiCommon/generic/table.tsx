import React from "react";

type ColumnSpec<T> = {
  render: (row: T) => React.ReactNode;
  width?: number;
  name: string;
};

export function Table<T>(props: {
  data: T[];
  columns: ColumnSpec<T>[];
  getKey: (row: T, idx: number) => string;
}) {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid gray" }}>
          {props.columns.map((colSpec, colIdx) => (
            <th
              key={colSpec.name}
              style={{
                paddingLeft: 5,
                paddingRight: 5,
                width: colSpec.width,
                borderRight:
                  colIdx === props.columns.length - 1
                    ? "none"
                    : "1px solid lightgray",
              }}
            >
              {colSpec.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.data.length === 0 ? (
          <tr>
            <td colSpan={props.columns.length} style={{ textAlign: "center" }}>
              <em>Empty</em>
            </td>
          </tr>
        ) : null}
        {props.data.map((row, rowIdx) => (
          <tr key={props.getKey(row, rowIdx)} style={{ verticalAlign: "top" }}>
            {props.columns.map((colSpec, colIdx) => (
              <td
                key={colSpec.name}
                style={{
                  paddingLeft: 5,
                  paddingRight: 5,
                  borderRight:
                    colIdx === props.columns.length - 1
                      ? "none"
                      : "1px solid lightgray",
                }}
              >
                {colSpec.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
