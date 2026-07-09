# Quantum Random Number Generator (QRNG)

Design and implementation of a Quantum Random Number Generator and its application to modern warfare.

## Overview

This system generates truly random numbers using simulated quantum mechanical principles (superposition and measurement). It provides cryptographically secure random numbers for defense-grade encryption applications.

### How It Works

1. **Hadamard Gate**: Places a qubit into equal superposition (|0⟩ + |1⟩)/√2
2. **Measurement**: Collapses the superposition, yielding 0 or 1 with 50% probability
3. **Entanglement** (Qiskit): Correlated qubit pairs via Bell circuits
4. **Key Generation**: Quantum entropy feeds AES-256-GCM encryption

## Project Structure

```
src/
  qrng/
    simulated-qrng.js   - Pure JS quantum simulation
    qiskit-bridge.js     - IBM Quantum REST API integration
    randomness-tests.js  - NIST STS-like statistical tests
  crypto/
    key-generator.js     - QRNG-based cryptographic key generation
    secure-channel.js    - AES-256-GCM encryption/decryption demo
  db/
    connection.js        - MongoDB connection
    models/              - Mongoose schemas (5 collections)
  cli/index.js          - CLI tool
  server/
    index.js             - Express API server
    routes/api.js        - REST endpoints
web-dashboard/           - Real-time visualization
tests/                   - Unit tests
```

## Quick Start

```bash
# Install
npm install

# Run CLI
npm run cli -- generate 256
npm run cli -- test 10000
npm run cli -- keygen
npm run cli -- encrypt "CLASSIFIED: coordinates 47.6N 122.3W"

# Start dashboard (requires MongoDB)
npm run server
# Open http://localhost:3000
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `qrng generate [bits]` | Generate random bits via simulated QRNG |
| `qrng test [bits]` | Run randomness test suite |
| `qrng keygen -t <type>` | Generate cryptographic keys (aes, hmac, keypair) |
| `qrng encrypt <msg>` | Encrypt message with QRNG-generated keys |
| `qrng qiskit --bits 128` | Submit job to IBM Quantum hardware |
| `qrng dashboard` | Start web dashboard |

## IBM Quantum Integration

For real quantum hardware, set in `.env`:
```
IBMQ_API_KEY=your_ibm_cloud_api_key
IBMQ_INSTANCE=your_ibm_instance_crn
IBMQ_BACKEND=ibm_brisbane
```

Without credentials, the system runs in simulator-only mode.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | System status |
| POST | `/api/generate` | Generate random bits |
| POST | `/api/test` | Run randomness tests |
| POST | `/api/keygen` | Generate crypto keys |
| POST | `/api/encrypt` | Encrypt message |
| POST | `/api/decrypt` | Decrypt message |
| GET | `/api/history/:type` | Get history (batches, tests, keys, messages, qiskit) |

## Randomness Tests

Statistical tests implemented (NIST STS-inspired):
- Frequency (Monobit) Test
- Runs Test
- Chi-Square Test
- Approximate Entropy Test
- Serial Test
- Longest Run of Ones Test
