export class RandomnessTester {
  constructor(name = 'test') {
    this.name = name;
    this.results = [];
  }

  test(bits) {
    this.results = [];
    return {
      name: this.name,
      bitsLength: bits.length,
      results: [
        this._frequencyTest(bits),
        this._runsTest(bits),
        this._chiSquareTest(bits),
        this._approximateEntropy(bits),
        this._serialTest(bits),
        this._longestRunTest(bits),
      ],
    };
  }

  _frequencyTest(bits) {
    const n = bits.length;
    const sum = bits.reduce((a, b) => a + (b === 1 ? 1 : -1), 0);
    const sObs = Math.abs(sum) / Math.sqrt(n);
    const pValue = this._erfc(sObs / Math.SQRT2);
    return {
      name: 'Frequency (Monobit) Test',
      statistic: sObs,
      pValue,
      passed: pValue >= 0.01,
    };
  }

  _runsTest(bits) {
    const n = bits.length;
    const pi = bits.filter(b => b === 1).length / n;
    const tau = 2 / Math.sqrt(n);
    if (Math.abs(pi - 0.5) >= tau) {
      return { name: 'Runs Test', statistic: 0, pValue: 0, passed: false };
    }
    let runs = 1;
    for (let i = 1; i < n; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    const num = Math.abs(runs - 2 * n * pi * (1 - pi));
    const den = 2 * Math.sqrt(2 * n) * pi * (1 - pi);
    const pValue = this._erfc(num / den);
    return {
      name: 'Runs Test',
      statistic: runs,
      pValue,
      passed: pValue >= 0.01,
    };
  }

  _chiSquareTest(bits, bins = 256) {
    const n = Math.floor(bits.length / 8) * 8;
    const expected = n / bins / 8;
    const counts = new Array(bins).fill(0);
    for (let i = 0; i < n; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | (bits[i + j] || 0);
      }
      counts[byte]++;
    }
    const chiSq = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    const pValue = this._chiSquarePValue(chiSq, bins - 1);
    return {
      name: 'Chi-Square Test',
      statistic: chiSq,
      pValue,
      passed: pValue >= 0.01 && pValue <= 0.99,
    };
  }

  _approximateEntropy(bits, m = 2) {
    const n = bits.length;
    const phiM = this._phi(bits, m, n);
    const phiM1 = this._phi(bits, m + 1, n);
    const apEn = phiM - phiM1;
    return {
      name: 'Approximate Entropy Test',
      statistic: apEn,
      pValue: null,
      passed: apEn > 0.5,
    };
  }

  _phi(bits, m, n) {
    const patterns = new Map();
    for (let i = 0; i < n; i++) {
      let pattern = 0;
      for (let j = 0; j < m; j++) {
        pattern = (pattern << 1) | bits[(i + j) % n];
      }
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
    let sum = 0;
    for (const count of patterns.values()) {
      const pi = count / n;
      sum += pi * Math.log(pi);
    }
    return sum;
  }

  _serialTest(bits) {
    const n = bits.length;
    const obs = bits.filter(b => b === 1).length;
    const expected = n / 2;
    const stat = (obs - expected) ** 2 / expected;
    const pValue = this._chiSquarePValue(stat, 1);
    return {
      name: 'Serial Test',
      statistic: stat,
      pValue,
      passed: pValue >= 0.01,
    };
  }

  _longestRunTest(bits) {
    const n = bits.length;
    let maxRun = 0;
    let currentRun = 0;
    for (const bit of bits) {
      if (bit === 1) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else {
        currentRun = 0;
      }
    }
    const expectedMax = Math.log2(n);
    const pValue = Math.exp(-Math.abs(maxRun - expectedMax) / expectedMax);
    return {
      name: 'Longest Run of Ones Test',
      statistic: maxRun,
      pValue,
      passed: pValue >= 0.01,
    };
  }

  _erfc(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  _chiSquarePValue(x, df) {
    if (x <= 0) return 1;
    return this._regularizedGamma(df / 2, x / 2);
  }

  _regularizedGamma(a, x) {
    if (x < 0 || a <= 0) return 1;
    if (x < a + 1) return this._gammaSeries(a, x);
    return 1 - this._gammaContinuedFraction(a, x);
  }

  _gammaSeries(a, x) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-15 * Math.abs(sum)) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - this._logGamma(a));
  }

  _gammaContinuedFraction(a, x) {
    const F = (2 * x - a + 2) / (2 * x + 2);
    let f = F;
    for (let i = 100; i >= 1; i--) {
      const ai = i * (a - i);
      const bi = 2 * x + 2 * i + 1 - a;
      f = ai / (bi + f);
    }
    const p = 1 / (x + 1 - a + (1 - a) / (x + 3 - a + f));
    return p * Math.exp(-x + a * Math.log(x) - this._logGamma(a));
  }

  _logGamma(x) {
    const c = [
      76.18009172947146, -86.50532032941677,
      24.01409824083091, -1.231739572450155,
      0.1208650973866179e-2, -0.5395239384953e-5,
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      y++;
      ser += c[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
}

export function createRandomnessTester(name) {
  return new RandomnessTester(name);
}
