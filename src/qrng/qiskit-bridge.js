const IBM_AUTH_URL = 'https://iam.cloud.ibm.com/identity/token';
const IBM_API_BASE = 'https://quantum.cloud.ibm.com/api/v1';

export class QiskitBridge {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.IBMQ_API_KEY;
    this.instance = options.instance || process.env.IBMQ_INSTANCE;
    this.backend = options.backend || process.env.IBMQ_BACKEND || 'ibm_brisbane';
    this.bearerToken = null;
    this.tokenExpiry = 0;
    this._circuitCounter = 0;
  }

  get isConfigured() {
    return !!(this.apiKey && this.instance);
  }

  async _getBearerToken() {
    if (this.bearerToken && Date.now() < this.tokenExpiry) {
      return this.bearerToken;
    }
    const resp = await fetch(IBM_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: this.apiKey,
      }),
    });
    if (!resp.ok) {
      throw new Error(`IBM auth failed: ${resp.status} ${await resp.text()}`);
    }
    const data = await resp.json();
    this.bearerToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return this.bearerToken;
  }

  _buildHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Service-CRN': this.instance,
      'IBM-API-Version': '2026-04-15',
    };
  }

  _buildBellCircuit(nQubits) {
    const qubits = Array.from({ length: nQubits }, (_, i) => i);
    let qasm = `OPENQASM 3.0;\ninclude "stdgates.inc";\n`;
    qasm += `qubit[${nQubits}] q;\nbit[${nQubits}] c;\n`;
    for (const q of qubits) {
      qasm += `h q[${q}];\n`;
    }
    for (let i = 0; i < nQubits - 1; i++) {
      qasm += `cx q[${i}], q[${i + 1}];\n`;
    }
    qasm += `c = measure q;\n`;
    return qasm;
  }

  _buildRandomCircuit(nQubits, depth) {
    const gates = ['h', 'x', 't'];
    let qasm = `OPENQASM 3.0;\ninclude "stdgates.inc";\n`;
    qasm += `qubit[${nQubits}] q;\nbit[${nQubits}] c;\n`;
    for (let d = 0; d < depth; d++) {
      for (let i = 0; i < nQubits; i++) {
        const gate = gates[Math.floor(Math.random() * gates.length)];
        qasm += `${gate} q[${i}];\n`;
      }
      for (let i = 0; i < nQubits - 1; i++) {
        if (Math.random() > 0.5) {
          qasm += `cx q[${i}], q[${i + 1}];\n`;
        }
      }
    }
    qasm += `c = measure q;\n`;
    return qasm;
  }

  async listBackends() {
    const token = await this._getBearerToken();
    const resp = await fetch(`${IBM_API_BASE}/backends`, {
      headers: this._buildHeaders(token),
    });
    if (!resp.ok) {
      throw new Error(`Failed to list backends: ${resp.status} ${await resp.text()}`);
    }
    const body = await resp.json();
    if (Array.isArray(body)) return body;
    if (body.backends && Array.isArray(body.backends)) return body.backends;
    if (body.results && Array.isArray(body.results)) return body.results;
    throw new Error('Unexpected backends response format');
  }

  async generateBits(n, options = {}) {
    if (!this.isConfigured) {
      throw new Error('IBM Quantum not configured. Set IBMQ_API_KEY and IBMQ_INSTANCE.');
    }
    const nQubits = options.nQubits || Math.min(n, 32);
    const shots = Math.ceil(n / nQubits);
    const circuit = options.circuit === 'random'
      ? this._buildRandomCircuit(nQubits, options.depth || 3)
      : this._buildBellCircuit(nQubits);

    const token = await this._getBearerToken();
    const jobPayload = {
      program_id: 'sampler',
      backend: this.backend,
      params: {
        pubs: [[circuit, null, shots]],
        options: {},
        version: 2,
      },
    };

    const jobResp = await fetch(`${IBM_API_BASE}/jobs`, {
      method: 'POST',
      headers: this._buildHeaders(token),
      body: JSON.stringify(jobPayload),
    });
    if (!jobResp.ok) {
      throw new Error(`Qiskit job submission failed: ${jobResp.status} ${await jobResp.text()}`);
    }
    const jobData = await jobResp.json();
    const jobId = jobData.id;

    const result = await this._pollJobResult(jobId, token);
    const bits = this._extractBitsFromResult(result, n);
    return { bits, jobId, nQubits, shots, circuit };
  }

  async _pollJobResult(jobId, token, maxAttempts = 60, delay = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const resp = await fetch(`${IBM_API_BASE}/jobs/${jobId}/results`, {
        headers: this._buildHeaders(token),
      });
      if (!resp.ok) {
        if (resp.status === 404 || resp.status === 202) {
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Job status check failed: ${resp.status} ${await resp.text()}`);
      }
      const data = await resp.json();
      if (data.status === 'DONE' || data.status === 'Completed') {
        return data;
      }
      if (data.status === 'ERROR' || data.status === 'Failed') {
        throw new Error(`Qiskit job failed: ${JSON.stringify(data)}`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error('Qiskit job polling timed out');
  }

  _extractBitsFromResult(result, n) {
    try {
      const samples = result?.results?.[0]?.data?.c?.samples;
      if (samples) {
        const bitString = samples.join('');
        return bitString.slice(0, n).split('').map(Number);
      }
    } catch {}
    throw new Error('Could not extract bits from Qiskit result');
  }
}

export function createQiskitBridge(options) {
  return new QiskitBridge(options);
}
