import crypto from 'node:crypto';

export class SimulatedQRNG {
  constructor() {
    this.qubits = [];
  }

  initQubits(n) {
    this.qubits = new Array(n).fill(null).map(() => ({
      alpha: { real: 1, imag: 0 },
      beta: { real: 0, imag: 0 },
    }));
    return this;
  }

  hadamard(qubitIndex) {
    const q = this.qubits[qubitIndex];
    const alpha = {
      real: (q.alpha.real + q.beta.real) / Math.SQRT2,
      imag: (q.alpha.imag + q.beta.imag) / Math.SQRT2,
    };
    const beta = {
      real: (q.alpha.real - q.beta.real) / Math.SQRT2,
      imag: (q.alpha.imag - q.beta.imag) / Math.SQRT2,
    };
    this.qubits[qubitIndex] = { alpha, beta };
    return this;
  }

  applyGate(gate, qubitIndex) {
    switch (gate) {
      case 'H': return this.hadamard(qubitIndex);
      case 'X': {
        const q = this.qubits[qubitIndex];
        [q.alpha, q.beta] = [q.beta, q.alpha];
        return this;
      }
      default:
        throw new Error(`Unknown gate: ${gate}`);
    }
  }

  measure(qubitIndex) {
    const q = this.qubits[qubitIndex];
    const prob0 = q.alpha.real ** 2 + q.alpha.imag ** 2;
    const rand = crypto.randomFloat ? crypto.randomFloat() : Math.random();
    const result = rand < prob0 ? 0 : 1;
    this.qubits[qubitIndex] = {
      alpha: result === 0 ? { real: 1, imag: 0 } : { real: 0, imag: 0 },
      beta: result === 0 ? { real: 0, imag: 0 } : { real: 1, imag: 0 },
    };
    return result;
  }

  measureAll() {
    return this.qubits.map((_, i) => this.measure(i));
  }

  generateBits(n) {
    const bits = [];
    while (bits.length < n) {
      this.initQubits(1).hadamard(0);
      bits.push(this.measure(0));
    }
    return bits;
  }

  generateBytes(n) {
    const bits = this.generateBits(n * 8);
    const bytes = [];
    for (let i = 0; i < n; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | bits[i * 8 + j];
      }
      bytes.push(byte);
    }
    return Buffer.from(bytes);
  }

  generateUint32() {
    const bits = this.generateBits(32);
    let value = 0;
    for (const bit of bits) {
      value = (value << 1) | bit;
    }
    return value >>> 0;
  }

  generateDouble() {
    const bits = this.generateBits(53);
    let value = 0;
    for (let i = 0; i < 53; i++) {
      value = (value << 1) | bits[i];
    }
    return value / (2 ** 53);
  }
}

export function createSimulatedQRNG() {
  return new SimulatedQRNG();
}
