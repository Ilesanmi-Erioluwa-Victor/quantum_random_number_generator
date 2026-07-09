import crypto from 'node:crypto';
import { SimulatedQRNG } from '../qrng/simulated-qrng.js';

export class KeyGenerator {
  constructor(qrngSource = null) {
    this.qrng = qrngSource || new SimulatedQRNG();
  }

  generateAESKey(bits = 256) {
    const bytes = bits / 8;
    const entropy = this.qrng.generateBytes(bytes);
    return {
      key: entropy,
      algorithm: 'AES',
      bitLength: bits,
      hex: entropy.toString('hex'),
    };
  }

  generateHMACKey(bits = 256) {
    const bytes = bits / 8;
    const entropy = this.qrng.generateBytes(bytes);
    return {
      key: entropy,
      algorithm: 'HMAC-SHA256',
      bitLength: bits,
      hex: entropy.toString('hex'),
    };
  }

  generateIV(bytes = 16) {
    const entropy = this.qrng.generateBytes(bytes);
    return {
      iv: entropy,
      hex: entropy.toString('hex'),
    };
  }

  generateKeyPair() {
    const seed = this.qrng.generateBytes(32);
    const tempKey = crypto.createHash('sha256').update(seed).digest();
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    return {
      publicKey,
      privateKey,
      algorithm: 'ECDSA P-256',
    };
  }

  generateSalt(bytes = 16) {
    return {
      salt: this.qrng.generateBytes(bytes),
      hex: this.qrng.generateBytes(bytes).toString('hex'),
    };
  }
}

export function createKeyGenerator(qrngSource) {
  return new KeyGenerator(qrngSource);
}
