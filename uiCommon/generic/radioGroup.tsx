import React from "react";

export function RadioGroup<T extends string>(props: {
  value: T;
  onChange: (value: T) => void;
  options: T[];
}) {
  return (
    <div>
      {props.options.map((option) => (
        <label key={option}>
          <input
            type="radio"
            value={option}
            checked={props.value === option}
            onChange={() => props.onChange(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}
