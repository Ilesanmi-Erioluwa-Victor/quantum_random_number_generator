import crypto from 'node:crypto';
import { SimulatedQRNG } from '../qrng/simulated-qrng.js';
import { KeyGenerator } from './key-generator.js';

export class SecureChannel {
  constructor(qrngSource = null) {
    this.qrng = qrngSource || new SimulatedQRNG();
    this.keyGen = new KeyGenerator(this.qrng);
    this.sessionKeys = null;
  }

  generateSessionKeys() {
    this.sessionKeys = {
      encryption: this.keyGen.generateAESKey(256),
      hmac: this.keyGen.generateHMACKey(256),
      iv: this.keyGen.generateIV(16),
      salt: this.keyGen.generateSalt(16),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return this.sessionKeys;
  }

  encryptMessage(plaintext, sessionKeys = null) {
    const keys = sessionKeys || this.sessionKeys;
    if (!keys) {
      throw new Error('No session keys available. Call generateSessionKeys() first.');
    }
    const iv = keys.iv.iv || crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keys.encryption.key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      keyId: keys.id,
    };
  }

  decryptMessage(encrypted, sessionKeys = null) {
    const keys = sessionKeys || this.sessionKeys;
    if (!keys) {
      throw new Error('No session keys available.');
    }
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        keys.encryption.key,
        Buffer.from(encrypted.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
      let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      return { plaintext, keyId: keys.id };
    } catch (err) {
      throw new Error(`Decryption failed: ${err.message}`);
    }
  }

  simulateMilitaryTransmission(message) {
    const keys = this.generateSessionKeys();
    const encrypted = this.encryptMessage(message, keys);
    const decrypted = this.decryptMessage(encrypted, keys);
    return {
      original: message,
      sessionKeyId: keys.id,
      encryptionKey: keys.encryption.hex,
      encrypted,
      decrypted: decrypted.plaintext,
      match: message === decrypted.plaintext,
      timestamp: new Date().toISOString(),
      note: 'Keys generated via QRNG - no pseudo-random seed vulnerability',
    };
  }
}

export function createSecureChannel(qrngSource) {
  return new SecureChannel(qrngSource);
}
