import React from "react";

type ColumnSpec<T> = {
  render: (row: T) => React.ReactNode;
  name: string;
};

export function Table<T>(props: {
  data: T[];
  columns: ColumnSpec<T>[];
  getKey: (row: T) => string;
}) {
  return (
    <table style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid gray" }}>
          {props.columns.map((colSpec) => (
            <th key={colSpec.name} style={{ paddingLeft: 5, paddingRight: 5 }}>
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
        {props.data.map((row) => (
          <tr key={props.getKey(row)}>
            {props.columns.map((colSpec, colIdx) => (
              <td
                key={colSpec.name}
                style={{
                  paddingLeft: 2,
                  paddingRight: 2,
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
