import { Router } from 'express';
import { SimulatedQRNG } from '../../qrng/simulated-qrng.js';
import { QiskitBridge } from '../../qrng/qiskit-bridge.js';
import { RandomnessTester } from '../../qrng/randomness-tests.js';
import { SecureChannel } from '../../crypto/secure-channel.js';
import { KeyGenerator } from '../../crypto/key-generator.js';
import { connectDB, isDBConnected } from '../../db/connection.js';
import { RandomBatch } from '../../db/models/RandomBatch.js';
import { TestResult } from '../../db/models/TestResult.js';
import { KeyGeneration } from '../../db/models/KeyGeneration.js';
import { Message } from '../../db/models/Message.js';
import { QiskitJob } from '../../db/models/QiskitJob.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    dbConnected: isDBConnected(),
    qiskitConfigured: !!process.env.IBMQ_API_KEY,
    version: '1.0.0',
  });
});

router.get('/qiskit/backends', async (req, res) => {
  try {
    const bridge = new QiskitBridge();
    if (!bridge.isConfigured) {
      return res.json({ configured: false, backends: [] });
    }
    const backends = await bridge.listBackends();
    const names = backends.map(b => (typeof b === 'string' ? b : b.name)).filter(Boolean);
    res.json({ configured: true, backends: names });
  } catch (err) {
    res.json({ configured: false, backends: [], error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { bits: n = 128, source = 'simulated' } = req.body;
    let bits;
    let metadata = {};
    if (source === 'qiskit') {
      const bridge = new QiskitBridge();
      if (!bridge.isConfigured) {
        return res.status(400).json({ error: 'IBM Quantum not configured. Set IBMQ_API_KEY and IBMQ_INSTANCE in env.' });
      }
      try {
        const result = await bridge.generateBits(n);
        bits = result.bits;
        metadata = { nQubits: result.nQubits, shots: result.shots, jobId: result.jobId };
      } catch (qErr) {
        if (qErr.message.includes('403') || qErr.message.includes('not authorized')) {
          return res.status(403).json({ error: 'Access denied to backend. Check IBM Quantum plan or use a different backend.', hint: 'Use GET /api/qiskit/backends to see available backends' });
        }
        throw qErr;
      }
    } else {
      const qrng = new SimulatedQRNG();
      bits = qrng.generateBits(n);
    }
    res.json({ bits, length: bits.length, source, metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { bits: n = 10000, source = 'simulated' } = req.body;
    const qrng = new SimulatedQRNG();
    const bits = qrng.generateBits(n);
    const tester = new RandomnessTester(source === 'qiskit' ? 'Qiskit QRNG' : 'Simulated QRNG');
    const result = tester.test(bits);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/keygen', async (req, res) => {
  try {
    const { type = 'aes', bits = 256 } = req.body;
    const keyGen = new KeyGenerator();
    let result;
    switch (type) {
      case 'aes': result = keyGen.generateAESKey(bits); break;
      case 'hmac': result = keyGen.generateHMACKey(bits); break;
      case 'keypair': result = keyGen.generateKeyPair(); break;
      default: return res.status(400).json({ error: 'Unknown key type' });
    }
    res.json({ ...result, type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/encrypt', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const channel = new SecureChannel();
    const result = channel.simulateMilitaryTransmission(message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/decrypt', async (req, res) => {
  try {
    const { ciphertext, iv, authTag, keyHex } = req.body;
    if (!ciphertext || !iv || !authTag || !keyHex) {
      return res.status(400).json({ error: 'Missing decryption parameters' });
    }
    const qrng = new SimulatedQRNG();
    const channel = new SecureChannel(qrng);
    channel.sessionKeys = {
      encryption: { key: Buffer.from(keyHex, 'hex'), algorithm: 'AES', bitLength: 256, hex: keyHex },
    };
    const result = channel.decryptMessage({ ciphertext, iv, authTag });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:type', async (req, res) => {
  try {
    if (!isDBConnected()) {
      return res.json([]);
    }
    const { type } = req.params;
    const { limit = 20 } = req.query;
    let data;
    switch (type) {
      case 'batches': data = await RandomBatch.find().sort({ createdAt: -1 }).limit(parseInt(limit)); break;
      case 'tests': data = await TestResult.find().sort({ createdAt: -1 }).limit(parseInt(limit)); break;
      case 'keys': data = await KeyGeneration.find().sort({ createdAt: -1 }).limit(parseInt(limit)); break;
      case 'messages': data = await Message.find().sort({ createdAt: -1 }).limit(parseInt(limit)); break;
      case 'qiskit': data = await QiskitJob.find().sort({ createdAt: -1 }).limit(parseInt(limit)); break;
      default: return res.status(400).json({ error: 'Unknown history type' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
