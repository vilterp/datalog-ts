export type SimplexResult = {
  result: "optimal" | "infeasible" | "unbounded";
  solution?: number[];
  objectiveValue?: number;
};

export class SimplexSolver {
  private A: number[][]; // Coefficient matrix
  private b: number[]; // Constant values
  private c: number[]; // Objective function coefficients

  constructor(A: number[][], b: number[], c: number[]) {
    this.A = A;
    this.b = b;
    this.c = c;
  }

  public solve(): SimplexResult {
    // Construct initial tableau
    let tableau = this.initializeTableau();

    while (true) {
      const pivotColumn = this.findEnteringColumn(tableau);
      if (pivotColumn < 0) {
        // All coefficients of the objective function are non-positive; we found the optimal solution.
        break;
      }

      const pivotRow = this.findLeavingRow(tableau, pivotColumn);
      if (pivotRow < 0) {
        return { result: "unbounded" };
      }

      this.doPivot(tableau, pivotRow, pivotColumn);

      // The algorithm continues until it reaches an optimal solution, becomes infeasible, or unbounded.
    }

    // Extract solution and objective value and return them
    return {
      result: "optimal",
      solution: this.extractSolution(tableau),
      objectiveValue: this.extractObjectiveValue(tableau),
    };
  }

  private initializeTableau(): number[][] {
    let tableau = [];

    // Initialize tableau from A, b, and c, assuming slack variables are added.
    for (let i = 0; i < this.A.length; i++) {
      tableau[i] = [
        ...this.A[i],
        1,
        ...new Array(this.A.length - 1).fill(0),
        this.b[i],
      ];
    }

    // Add the objective function row.
    tableau.push([...this.c, 0, ...new Array(this.A.length).fill(0), 0]);

    return tableau;
  }

  private findEnteringColumn(tableau: number[][]): number {
    // Find index of the first positive coefficient in the objective function row.
    const objectiveFunction = tableau[tableau.length - 1];
    for (let i = 0; i < objectiveFunction.length - 1; i++) {
      if (objectiveFunction[i] > 0) {
        return i;
      }
    }
    return -1; // All coefficients are non-positive, so we found the optimal solution.
  }

  private findLeavingRow(tableau: number[][], pivotColumn: number): number {
    let leavingRow = -1;
    let lowest = Number.MAX_VALUE;
    for (let i = 0; i < tableau.length - 1; i++) {
      if (tableau[i][pivotColumn] > 0) {
        const ratio =
          tableau[i][tableau[0].length - 1] / tableau[i][pivotColumn];
        if (ratio < lowest) {
          lowest = ratio;
          leavingRow = i;
        }
      }
    }
    return leavingRow;
  }

  private doPivot(
    tableau: number[][],
    pivotRow: number,
    pivotColumn: number
  ): void {
    const pivotElement = tableau[pivotRow][pivotColumn];

    // Divide the pivot row by the pivot element
    for (let i = 0; i < tableau[0].length; i++) {
      tableau[pivotRow][i] /= pivotElement;
    }

    // Make the other entries of the pivot column 0
    for (let i = 0; i < tableau.length; i++) {
      if (i !== pivotRow) {
        const multiplier = -tableau[i][pivotColumn];
        for (let j = 0; j < tableau[0].length; j++) {
          tableau[i][j] += multiplier * tableau[pivotRow][j];
        }
      }
    }
  }

  private extractSolution(tableau: number[][]): number[] {
    const numOrigVars = this.c.length;
    const solution = new Array(numOrigVars).fill(0);

    for (let i = 0; i < numOrigVars; i++) {
      let count = 0;
      let index = -1;
      for (let j = 0; j < tableau.length - 1; j++) {
        if (tableau[j][i] === 1) {
          index = j;
          count++;
        } else if (tableau[j][i] !== 0) {
          count++;
        }
      }

      if (count === 1 && index !== -1) {
        solution[i] = tableau[index][tableau[0].length - 1];
      }
    }

    return solution;
  }

  private extractObjectiveValue(tableau: number[][]): number {
    return -tableau[tableau.length - 1][tableau[0].length - 1];
  }
}
