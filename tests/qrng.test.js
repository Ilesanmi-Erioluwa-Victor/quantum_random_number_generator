import { SimulatedQRNG } from '../src/qrng/simulated-qrng.js';
import { RandomnessTester } from '../src/qrng/randomness-tests.js';
import { KeyGenerator } from '../src/crypto/key-generator.js';
import { SecureChannel } from '../src/crypto/secure-channel.js';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  PASS: ${message}`);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  console.log(`\n${name}`);
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`  ${err.message}`);
    failed++;
  }
}

test('SimulatedQRNG generates correct number of bits', () => {
  const qrng = new SimulatedQRNG();
  const bits = qrng.generateBits(128);
  assert(bits.length === 128, 'generates 128 bits');
  assert(bits.every(b => b === 0 || b === 1), 'all bits are 0 or 1');
});

test('SimulatedQRNG generates bytes', () => {
  const qrng = new SimulatedQRNG();
  const bytes = qrng.generateBytes(16);
  assert(bytes.length === 16, 'generates 16 bytes');
  assert(bytes instanceof Buffer, 'returns Buffer');
});

test('SimulatedQRNG generates uint32', () => {
  const qrng = new SimulatedQRNG();
  const val = qrng.generateUint32();
  assert(typeof val === 'number' && val >= 0 && val <= 0xFFFFFFFF, 'valid uint32 range');
});

test('SimulatedQRNG generates double', () => {
  const qrng = new SimulatedQRNG();
  const val = qrng.generateDouble();
  assert(typeof val === 'number' && val >= 0 && val < 1, 'valid double range');
});

test('SimulatedQRNG produces varying output', () => {
  const qrng = new SimulatedQRNG();
  const bits1 = qrng.generateBits(64);
  const bits2 = qrng.generateBits(64);
  const diff = bits1.filter((b, i) => b !== bits2[i]).length;
  assert(diff > 0, 'two runs produce different output');
});

test('RandomnessTester frequency test passes on random data', () => {
  const qrng = new SimulatedQRNG();
  const bits = qrng.generateBits(10000);
  const tester = new RandomnessTester('test');
  const result = tester.test(bits);
  const freqTest = result.results.find(r => r.name.includes('Frequency'));
  assert(freqTest.passed === true, 'frequency test passes on random data');
  assert(freqTest.pValue >= 0.01, 'p-value >= 0.01');
});

test('RandomnessTester runs test passes on random data', () => {
  const qrng = new SimulatedQRNG();
  const bits = qrng.generateBits(10000);
  const tester = new RandomnessTester('test');
  const result = tester.test(bits);
  const runsTest = result.results.find(r => r.name.includes('Runs'));
  assert(runsTest.passed === true, 'runs test passes on random data');
});

test('KeyGenerator generates AES key', () => {
  const keyGen = new KeyGenerator();
  const key = keyGen.generateAESKey(256);
  assert(key.bitLength === 256, '256-bit AES key');
  assert(key.key.length === 32, '32 byte key');
  assert(key.hex.length === 64, '64 char hex');
});

test('KeyGenerator generates HMAC key', () => {
  const keyGen = new KeyGenerator();
  const key = keyGen.generateHMACKey(256);
  assert(key.bitLength === 256, '256-bit HMAC key');
  assert(key.key.length === 32, '32 byte key');
});

test('KeyGenerator generates ECDSA key pair', () => {
  const keyGen = new KeyGenerator();
  const pair = keyGen.generateKeyPair();
  assert(pair.publicKey.includes('BEGIN PUBLIC KEY'), 'has public key');
  assert(pair.privateKey.includes('BEGIN PRIVATE KEY'), 'has private key');
});

test('SecureChannel encrypts and decrypts', () => {
  const channel = new SecureChannel();
  const result = channel.simulateMilitaryTransmission('SECRET: Attack at dawn');
  assert(result.match === true, 'decrypted matches original');
  assert(result.original === 'SECRET: Attack at dawn', 'message preserved');
  assert(result.encrypted.ciphertext.length > 0, 'ciphertext produced');
  assert(result.encrypted.authTag.length > 0, 'auth tag produced');
});

test('SecureChannel generates unique session keys', () => {
  const channel = new SecureChannel();
  const r1 = channel.simulateMilitaryTransmission('msg1');
  const r2 = channel.simulateMilitaryTransmission('msg2');
  assert(r1.sessionKeyId !== r2.sessionKeyId, 'unique session key IDs');
  assert(r1.encryptionKey !== r2.encryptionKey, 'unique encryption keys');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
