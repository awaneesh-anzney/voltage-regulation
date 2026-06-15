export interface Bus {
  id: number;
  name: string;
  type: 'Slack' | 'PV' | 'PQ';
  v: number; // in p.u.
  theta: number; // in radians
  pGen: number; // MW
  qGen: number; // MVAR
  pLoad: number; // MW
  qLoad: number; // MVAR
  baseKv: number;
}

export interface Branch {
  id: number;
  fromBus: number;
  toBus: number;
  r: number; // p.u.
  x: number; // p.u.
  b: number; // shunt susceptance (p.u.)
}

export interface LoadFlowResult {
  converged: boolean;
  iterations: number;
  maxMismatch: number;
  buses: Bus[];
  branches: {
    id: number;
    fromBus: number;
    toBus: number;
    pFromTo: number; // MW flow
    qFromTo: number; // MVAR flow
    pToFrom: number;
    qToFrom: number;
    losses: number; // MW loss
  }[];
}

// Simple Complex number operations
interface Complex {
  r: number;
  i: number;
}

function add(a: Complex, b: Complex): Complex {
  return { r: a.r + b.r, i: a.i + b.i };
}

function sub(a: Complex, b: Complex): Complex {
  return { r: a.r - b.r, i: a.i - b.i };
}

function mul(a: Complex, b: Complex): Complex {
  return { r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r };
}

function inv(a: Complex): Complex {
  const den = a.r * a.r + a.i * a.i;
  if (den === 0) return { r: 9999, i: 9999 };
  return { r: a.r / den, i: -a.i / den };
}

// Gaussian elimination to solve Ax = B
function solveLinearSystem(A: number[][], B: number[]): number[] {
  const n = B.length;
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Search for maximum in this column
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    const tempA = A[maxRow];
    A[maxRow] = A[i];
    A[i] = tempA;

    const tempB = B[maxRow];
    B[maxRow] = B[i];
    B[i] = tempB;

    if (Math.abs(A[i][i]) < 1e-12) {
      // Singular matrix, return zeros
      return new Array(n).fill(0);
    }

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      A[k][i] = 0; // exact zero
      B[k] += c * B[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    x[i] = (B[i] - sum) / A[i][i];
  }
  return x;
}

export function runNewtonRaphsonLoadFlow(
  busesInput: Bus[],
  branchesInput: Branch[],
  baseMva: number = 100,
  maxIterations: number = 20,
  tolerance: number = 0.0001
): LoadFlowResult {
  const n = busesInput.length;
  const buses = busesInput.map(b => ({ ...b }));
  const branches = branchesInput.map(br => ({ ...br }));

  // Bus ID mapping to index (0 to n-1)
  const idMap = new Map<number, number>();
  buses.forEach((b, i) => idMap.set(b.id, i));

  // Build Ybus Matrix
  const Y: Complex[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ r: 0, i: 0 }))
  );

  branches.forEach(br => {
    const fIdx = idMap.get(br.fromBus);
    const tIdx = idMap.get(br.toBus);
    if (fIdx === undefined || tIdx === undefined) return;

    // Series admittance y = 1 / (r + jx)
    const z = { r: br.r, i: br.x };
    const y = inv(z);

    // Mutual elements
    Y[fIdx][tIdx] = sub(Y[fIdx][tIdx], y);
    Y[tIdx][fIdx] = sub(Y[tIdx][fIdx], y);

    // Self elements contribution
    Y[fIdx][fIdx] = add(Y[fIdx][fIdx], y);
    Y[tIdx][tIdx] = add(Y[tIdx][tIdx], y);

    // Shunt charging susceptance
    const halfShunt = { r: 0, i: br.b / 2 };
    Y[fIdx][fIdx] = add(Y[fIdx][fIdx], halfShunt);
    Y[tIdx][tIdx] = add(Y[tIdx][tIdx], halfShunt);
  });

  let converged = false;
  let iterations = 0;
  let maxMismatch = 0;

  // Track PV/PQ indices
  const pqIndices: number[] = [];
  const pvIndices: number[] = [];
  const nonSlackIndices: number[] = [];

  buses.forEach((b, idx) => {
    if (b.type === 'PQ') {
      pqIndices.push(idx);
      nonSlackIndices.push(idx);
    } else if (b.type === 'PV') {
      pvIndices.push(idx);
      nonSlackIndices.push(idx);
    }
  });

  const numP = nonSlackIndices.length;
  const numQ = pqIndices.length;
  const numEquations = numP + numQ;

  while (iterations < maxIterations && !converged) {
    iterations++;

    // 1. Calculate P and Q calculated
    const P_calc = new Array(n).fill(0);
    const Q_calc = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let pSum = 0;
      let qSum = 0;
      const vi = buses[i].v;
      const ti = buses[i].theta;

      for (let j = 0; j < n; j++) {
        const vj = buses[j].v;
        const tj = buses[j].theta;
        const Gij = Y[i][j].r;
        const Bij = Y[i][j].i;

        const diffAngle = ti - tj;
        pSum += vj * (Gij * Math.cos(diffAngle) + Bij * Math.sin(diffAngle));
        qSum += vj * (Gij * Math.sin(diffAngle) - Bij * Math.cos(diffAngle));
      }
      P_calc[i] = vi * pSum;
      Q_calc[i] = vi * qSum;
    }

    // 2. Mismatch Vectors
    const dP = new Array(numP).fill(0);
    const dQ = new Array(numQ).fill(0);
    maxMismatch = 0;

    nonSlackIndices.forEach((i, idx) => {
      const pSched = (buses[i].pGen - buses[i].pLoad) / baseMva;
      dP[idx] = pSched - P_calc[i];
      if (Math.abs(dP[idx]) > maxMismatch) {
        maxMismatch = Math.abs(dP[idx]);
      }
    });

    pqIndices.forEach((i, idx) => {
      const qSched = (buses[i].qGen - buses[i].qLoad) / baseMva;
      dQ[idx] = qSched - Q_calc[i];
      if (Math.abs(dQ[idx]) > maxMismatch) {
        maxMismatch = Math.abs(dQ[idx]);
      }
    });

    if (maxMismatch < tolerance) {
      converged = true;
      break;
    }

    // 3. Build Jacobian Matrix J
    const J = Array.from({ length: numEquations }, () => new Array(numEquations).fill(0));

    // Fill Jacobian
    // J11 = dP / dTheta
    // J12 = dP / dV
    // J21 = dQ / dTheta
    // J22 = dQ / dV
    nonSlackIndices.forEach((i, rIdx) => {
      const vi = buses[i].v;
      const ti = buses[i].theta;

      // J11 and J12 columns
      nonSlackIndices.forEach((j, cIdx) => {
        if (i === j) {
          // Off diagonal sums needed for diagonal element
          let dPdThetaDiag = 0;
          let dPdVDiag = 0;
          for (let k = 0; k < n; k++) {
            if (k !== i) {
              const vk = buses[k].v;
              const tk = buses[k].theta;
              const Gik = Y[i][k].r;
              const Bik = Y[i][k].i;
              const diff = ti - tk;
              dPdThetaDiag += vk * (-Gik * Math.sin(diff) + Bik * Math.cos(diff));
              dPdVDiag += vk * (Gik * Math.cos(diff) + Bik * Math.sin(diff));
            }
          }
          J[rIdx][cIdx] = vi * dPdThetaDiag; // H_ii
          
          // J12 Diagonal column (only for non-slack vs non-slack)
          // Find matching column index in nonSlackIndices corresponding to V
          // Note J12 columns only exist for PQ buses
        } else {
          const vj = buses[j].v;
          const tj = buses[j].theta;
          const Gij = Y[i][j].r;
          const Bij = Y[i][j].i;
          const diff = ti - tj;
          J[rIdx][cIdx] = vi * vj * (Gij * Math.sin(diff) - Bij * Math.cos(diff)); // H_ij
        }
      });

      // J12 columns: derivatives of P wrt V (only for PQ buses)
      pqIndices.forEach((j, cIdx) => {
        const cOffset = numP + cIdx;
        if (i === j) {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            const vk = buses[k].v;
            const tk = buses[k].theta;
            const Gik = Y[i][k].r;
            const Bik = Y[i][k].i;
            const diff = ti - tk;
            sum += vk * (Gik * Math.cos(diff) + Bik * Math.sin(diff));
          }
          J[rIdx][cOffset] = sum + vi * Y[i][i].r; // N_ii
        } else {
          const ti = buses[i].theta;
          const tj = buses[j].theta;
          const Gij = Y[i][j].r;
          const Bij = Y[i][j].i;
          const diff = ti - tj;
          J[rIdx][cOffset] = vi * (Gij * Math.cos(diff) + Bij * Math.sin(diff)); // N_ij
        }
      });
    });

    pqIndices.forEach((i, rIdx) => {
      const rOffset = numP + rIdx;
      const vi = buses[i].v;
      const ti = buses[i].theta;

      // J21: derivatives of Q wrt Theta
      nonSlackIndices.forEach((j, cIdx) => {
        if (i === j) {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            if (k !== i) {
              const vk = buses[k].v;
              const tk = buses[k].theta;
              const Gik = Y[i][k].r;
              const Bik = Y[i][k].i;
              const diff = ti - tk;
              sum += vk * (Gik * Math.cos(diff) + Bik * Math.sin(diff));
            }
          }
          J[rOffset][cIdx] = vi * sum; // M_ii
        } else {
          const vj = buses[j].v;
          const tj = buses[j].theta;
          const Gij = Y[i][j].r;
          const Bij = Y[i][j].i;
          const diff = ti - tj;
          J[rOffset][cIdx] = -vi * vj * (Gij * Math.cos(diff) + Bij * Math.sin(diff)); // M_ij
        }
      });

      // J22: derivatives of Q wrt V (only PQ)
      pqIndices.forEach((j, cIdx) => {
        const cOffset = numP + cIdx;
        if (i === j) {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            const vk = buses[k].v;
            const tk = buses[k].theta;
            const Gik = Y[i][k].r;
            const Bik = Y[i][k].i;
            const diff = ti - tk;
            sum += vk * (Gik * Math.sin(diff) - Bik * Math.cos(diff));
          }
          J[rOffset][cOffset] = sum - vi * Y[i][i].i; // L_ii
        } else {
          const tj = buses[j].theta;
          const Gij = Y[i][j].r;
          const Bij = Y[i][j].i;
          const diff = ti - tj;
          J[rOffset][cOffset] = vi * (Gij * Math.sin(diff) - Bij * Math.cos(diff)); // L_ij
        }
      });
    });

    // 4. Solve for corrections
    const deltaMismatches = [...dP, ...dQ];
    const corrections = solveLinearSystem(J, deltaMismatches);

    // 5. Update states
    nonSlackIndices.forEach((i, idx) => {
      buses[i].theta += corrections[idx];
    });

    pqIndices.forEach((i, idx) => {
      buses[i].v += corrections[numP + idx];
    });
  }

  // 6. Calculate Slack / PV generation results
  // Compute line flows
  const calculatedBranches = branches.map(br => {
    const fIdx = idMap.get(br.fromBus)!;
    const tIdx = idMap.get(br.toBus)!;
    const vi = buses[fIdx].v;
    const vj = buses[tIdx].v;
    const ti = buses[fIdx].theta;
    const tj = buses[tIdx].theta;

    const z = { r: br.r, i: br.x };
    const y = inv(z);

    // Current from I to J
    // I_ij = (V_i - V_j) * y + V_i * (j * b_shunt / 2)
    const Vi_complex = { r: vi * Math.cos(ti), i: vi * Math.sin(ti) };
    const Vj_complex = { r: vj * Math.cos(tj), i: vj * Math.sin(tj) };

    const Vdiff = sub(Vi_complex, Vj_complex);
    const I_series = mul(Vdiff, y);

    const shunt_admittance = { r: 0, i: br.b / 2 };
    const I_shunt_f = mul(Vi_complex, shunt_admittance);

    const I_f = add(I_series, I_shunt_f);

    // Power from I to J
    // S_ij = V_i * conj(I_f)
    const I_f_conj = { r: I_f.r, i: -I_f.i };
    const S_f = mul(Vi_complex, I_f_conj);

    // Current from J to I
    const I_shunt_t = mul(Vj_complex, shunt_admittance);
    const I_t = add({ r: -I_series.r, i: -I_series.i }, I_shunt_t);
    const I_t_conj = { r: I_t.r, i: -I_t.i };
    const S_t = mul(Vj_complex, I_t_conj);

    const pFromTo = S_f.r * baseMva;
    const qFromTo = S_f.i * baseMva;

    const pToFrom = S_t.r * baseMva;
    const qToFrom = S_t.i * baseMva;

    const losses = (S_f.r + S_t.r) * baseMva;

    return {
      id: br.id,
      fromBus: br.fromBus,
      toBus: br.toBus,
      pFromTo: round(pFromTo, 3),
      qFromTo: round(qFromTo, 3),
      pToFrom: round(pToFrom, 3),
      qToFrom: round(qToFrom, 3),
      losses: round(losses, 3)
    };
  });

  // Calculate slack generation or PV generation after flow solver
  buses.forEach((b, idx) => {
    // S = V * conj(I_inj) where conj(I_inj) = sum(conj(Y_ij * V_j))
    const vi = b.v;
    const ti = b.theta;
    const Vi_complex = { r: vi * Math.cos(ti), i: vi * Math.sin(ti) };

    let I_inj = { r: 0, i: 0 };
    for (let j = 0; j < n; j++) {
      const vj = buses[j].v;
      const tj = buses[j].theta;
      const Vj_complex = { r: vj * Math.cos(tj), i: vj * Math.sin(tj) };
      I_inj = add(I_inj, mul(Y[idx][j], Vj_complex));
    }

    const I_inj_conj = { r: I_inj.r, i: -I_inj.i };
    const S_inj = mul(Vi_complex, I_inj_conj);

    const calculated_P = S_inj.r * baseMva;
    const calculated_Q = S_inj.i * baseMva;

    if (b.type === 'Slack') {
      b.pGen = round(calculated_P + b.pLoad, 2);
      b.qGen = round(calculated_Q + b.qLoad, 2);
    } else if (b.type === 'PV') {
      b.qGen = round(calculated_Q + b.qLoad, 2);
    }
  });

  return {
    converged,
    iterations,
    maxMismatch: round(maxMismatch, 6),
    buses: buses.map(b => ({
      ...b,
      theta: round(b.theta * (180 / Math.PI), 3), // to degrees for display
      v: round(b.v, 4)
    })),
    branches: calculatedBranches
  };
}

function round(val: number, decimals: number): number {
  return parseFloat(val.toFixed(decimals));
}
