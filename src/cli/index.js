#!/usr/bin/env node

import { program } from 'commander';
import { config } from 'dotenv';
import chalk from 'chalk';
import { SimulatedQRNG } from '../qrng/simulated-qrng.js';
import { QiskitBridge } from '../qrng/qiskit-bridge.js';
import { RandomnessTester } from '../qrng/randomness-tests.js';
import { SecureChannel } from '../crypto/secure-channel.js';
import { KeyGenerator } from '../crypto/key-generator.js';
import { connectDB } from '../db/connection.js';
import { RandomBatch } from '../db/models/RandomBatch.js';
import { TestResult } from '../db/models/TestResult.js';
import { KeyGeneration } from '../db/models/KeyGeneration.js';
import { Message } from '../db/models/Message.js';
import { QiskitJob } from '../db/models/QiskitJob.js';

config();

program
  .name('qrng')
  .description('Quantum Random Number Generator CLI')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate random bits using simulated QRNG')
  .argument('[bits]', 'Number of bits to generate', '128')
  .option('-f, --format <format>', 'Output format: bits, hex, bytes', 'bits')
  .action(async (bitsStr, options) => {
    const n = parseInt(bitsStr);
    const qrng = new SimulatedQRNG();
    const bits = qrng.generateBits(n);
    printResult(n, bits, options.format);
    await tryStoreResult('simulated', bits);
  });

program
  .command('test')
  .description('Run randomness tests on generated bits')
  .argument('[bits]', 'Number of bits to test', '10000')
  .action(async (bitsStr) => {
    const n = parseInt(bitsStr);
    const qrng = new SimulatedQRNG();
    console.log(chalk.cyan(`\nGenerating ${n} bits via QRNG...\n`));
    const bits = qrng.generateBits(n);
    const tester = new RandomnessTester('QRNG Test');
    const result = tester.test(bits);
    printTestResults(result);
    await tryStoreTest('simulated', bits, result);
  });

program
  .command('keygen')
  .description('Generate cryptographic keys from QRNG entropy')
  .option('-t, --type <type>', 'Key type: aes, hmac, keypair', 'aes')
  .option('-b, --bits <bits>', 'Key size in bits', '256')
  .action(async (options) => {
    const keyGen = new KeyGenerator();
    console.log(chalk.cyan('\nGenerating keys from QRNG entropy...\n'));
    let result;
    switch (options.type) {
      case 'aes': {
        result = keyGen.generateAESKey(parseInt(options.bits));
        console.log(chalk.green('AES Key Generated:'));
        console.log(`  Algorithm: ${result.algorithm}`);
        console.log(`  Bit Length: ${result.bitLength}`);
        console.log(`  Hex: ${chalk.yellow(result.hex)}`);
        break;
      }
      case 'hmac': {
        result = keyGen.generateHMACKey(parseInt(options.bits));
        console.log(chalk.green('HMAC Key Generated:'));
        console.log(`  Algorithm: ${result.algorithm}`);
        console.log(`  Hex: ${chalk.yellow(result.hex)}`);
        break;
      }
      case 'keypair': {
        result = keyGen.generateKeyPair();
        console.log(chalk.green('ECDSA Key Pair Generated:'));
        console.log(`  Algorithm: ${result.algorithm}`);
        console.log(`  Public Key:\n${chalk.yellow(result.publicKey)}`);
        break;
      }
    }
    await tryStoreKeyGen(options.type, result);
  });

program
  .command('encrypt')
  .description('Encrypt a message using QRNG-generated keys')
  .argument('<message>', 'Message to encrypt')
  .action(async (message) => {
    const channel = new SecureChannel();
    console.log(chalk.cyan('\n=== Military-Grade Secure Transmission ===\n'));
    const result = channel.simulateMilitaryTransmission(message);
    console.log(chalk.green('Original:'), result.original);
    console.log(chalk.green('Session Key ID:'), result.sessionKeyId);
    console.log(chalk.green('Encryption Key (QRNG):'), result.encryptionKey.slice(0, 32) + '...');
    console.log(chalk.green('Ciphertext:'), chalk.yellow(result.encrypted.ciphertext));
    console.log(chalk.green('Auth Tag:'), result.encrypted.authTag);
    console.log(chalk.green('Decrypted:'), result.decrypted);
    console.log(chalk.green('Integrity:'), result.match ? chalk.green('PASS') : chalk.red('FAIL'));
    console.log(chalk.cyan('\nNote: Keys generated via quantum randomness - no PRNG seed vulnerability\n'));
    await tryStoreMessage(result.encrypted);
  });

program
  .command('qiskit')
  .description('Submit a random number generation job to IBM Quantum')
  .option('-b, --bits <bits>', 'Number of bits to generate', '128')
  .option('--backend <backend>', 'IBM Quantum backend', process.env.IBMQ_BACKEND || 'ibm_brisbane')
  .option('--list-backends', 'List available backends')
  .action(async (options) => {
    if (options.listBackends) {
      const bridge = new QiskitBridge();
      try {
        const backends = await bridge.listBackends();
        console.log(chalk.cyan('\nAvailable Backends:\n'));
        backends.forEach(b => console.log(`  - ${chalk.yellow(b.name)}`));
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
      }
      return;
    }
    const bridge = new QiskitBridge({ backend: options.backend });
    if (!bridge.isConfigured) {
      console.log(chalk.yellow('\nIBM Quantum not configured. Using simulated QRNG instead.'));
      console.log(chalk.yellow('Set IBMQ_API_KEY and IBMQ_INSTANCE in .env to use real quantum hardware.\n'));
      const qrng = new SimulatedQRNG();
      const bits = qrng.generateBits(parseInt(options.bits));
      console.log(chalk.green(`Generated ${bits.length} bits (simulated):`));
      console.log(chalk.yellow(bits.join('')));
      return;
    }
    console.log(chalk.cyan(`\nSubmitting job to ${options.backend}...\n`));
    try {
      const result = await bridge.generateBits(parseInt(options.bits));
      console.log(chalk.green(`Job ${result.jobId} completed:`));
      console.log(chalk.green(`Bits: ${chalk.yellow(result.bits.join(''))}`));
      console.log(chalk.green(`Qubits: ${result.nQubits}, Shots: ${result.shots}`));
      await tryStoreQiskitJob(result);
      await tryStoreResult('qiskit', result.bits);
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
    }
  });

program
  .command('dashboard')
  .description('Start the web dashboard server')
  .option('-p, --port <port>', 'Port to run on', process.env.PORT || '3000')
  .action(async (options) => {
    console.log(chalk.cyan('\nStarting QRNG web dashboard...\n'));
    const { default: express } = await import('express');
    const { default: cors } = await import('cors');
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static('web-dashboard'));
    const { default: apiRouter } = await import('../server/routes/api.js');
    app.use('/api', apiRouter);
    app.listen(options.port, () => {
      console.log(chalk.green(`Dashboard: http://localhost:${options.port}`));
      console.log(chalk.green(`API:       http://localhost:${options.port}/api`));
      console.log(chalk.green(`Docs:      http://localhost:${options.port}/api/status\n`));
    });
  });

program.parse(process.argv);

function printResult(n, bits, format) {
  if (format === 'bits') {
    console.log(chalk.green(`\nGenerated ${n} random bits:`));
    console.log(chalk.yellow(bits.join('')));
  } else if (format === 'hex') {
    const hex = bitsToHex(bits);
    console.log(chalk.green(`\nGenerated ${n} random bits (hex):`));
    console.log(chalk.yellow(hex));
  } else {
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i + j < bits.length; j++) {
        byte = (byte << 1) | bits[i + j];
      }
      bytes.push(byte);
    }
    console.log(chalk.green(`\nGenerated ${bytes.length} random bytes:`));
    console.log(chalk.yellow(Buffer.from(bytes).toString('hex')));
  }
}

function printTestResults(result) {
  console.log(chalk.cyan('=== Randomness Test Results ===\n'));
  console.log(`  Test Name: ${chalk.white(result.name)}`);
  console.log(`  Bits Tested: ${chalk.white(result.bitsLength)}\n`);
  let allPassed = true;
  for (const test of result.results) {
    const status = test.passed ? chalk.green('PASS') : chalk.red('FAIL');
    if (!test.passed) allPassed = false;
    console.log(`  ${status} ${test.name}`);
    console.log(`       Statistic: ${test.statistic.toFixed(6)}`);
    if (test.pValue !== null) {
      console.log(`       p-value:   ${test.pValue.toFixed(6)}`);
    }
    console.log('');
  }
  console.log(chalk.cyan(`=== Overall: ${allPassed ? chalk.green('ALL TESTS PASSED') : chalk.red('SOME TESTS FAILED')} ===\n`));
}

function bitsToHex(bits) {
  const nibbles = [];
  for (let i = 0; i < bits.length; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4 && i + j < bits.length; j++) {
      nibble = (nibble << 1) | bits[i + j];
    }
    nibbles.push(nibble.toString(16));
  }
  return nibbles.join('');
}

async function tryStoreResult(source, bits) {
  await connectDB();
  try {
    const batch = new RandomBatch({
      source,
      bitsLength: bits.length,
      bits: bits.join(''),
    });
    await batch.save();
  } catch {}
}

async function tryStoreTest(source, bits, result) {
  await connectDB();
  try {
    const testDoc = new TestResult({
      source,
      bitsLength: bits.length,
      tests: result.results,
      allPassed: result.results.every(r => r.passed),
    });
    await testDoc.save();
  } catch {}
}

async function tryStoreKeyGen(type, result) {
  await connectDB();
  try {
    const doc = new KeyGeneration({
      keyType: type.toUpperCase(),
      bitLength: result.bitLength || 256,
      hexPreview: (result.hex || result.publicKey || '').slice(0, 16),
    });
    await doc.save();
  } catch {}
}

async function tryStoreMessage(encrypted) {
  await connectDB();
  try {
    const doc = new Message({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyId: encrypted.keyId,
    });
    await doc.save();
  } catch {}
}

async function tryStoreQiskitJob(result) {
  await connectDB();
  try {
    const doc = new QiskitJob({
      jobId: result.jobId,
      backend: 'ibm_quantum',
      nQubits: result.nQubits,
      shots: result.shots,
      circuit: result.circuit,
      status: 'completed',
      bitsLength: result.bits.length,
      completedAt: new Date(),
    });
    await doc.save();
  } catch {}
}
