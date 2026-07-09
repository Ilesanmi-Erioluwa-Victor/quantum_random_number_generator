import { config } from 'dotenv';
import { connectDB } from './db/connection.js';

config();

export { SimulatedQRNG, createSimulatedQRNG, QiskitBridge, createQiskitBridge, RandomnessTester, createRandomnessTester } from './qrng/index.js';
export { KeyGenerator, createKeyGenerator, SecureChannel, createSecureChannel } from './crypto/index.js';
export { RandomBatch, TestResult, KeyGeneration, Message, QiskitJob } from './db/index.js';

export async function initDB() {
  await connectDB();
}
