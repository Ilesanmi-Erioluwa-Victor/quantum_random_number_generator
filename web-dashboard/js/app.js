const API_BASE = '/api';
let streaming = false;
let streamInterval = null;

async function apiCall(endpoint, options = {}) {
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || body.hint || `HTTP ${resp.status}`);
  }
  return resp.json();
}

function updateBitStream(bits) {
  const el = document.getElementById('bitstream');
  el.textContent = bits.join('');
  document.getElementById('statBits').textContent = bits.length;
  const ones = bits.filter(b => b === 1).length;
  const zeros = bits.length - ones;
  document.getElementById('statOnes').textContent = ones;
  document.getElementById('statZeros').textContent = zeros;
  document.getElementById('statRatio').textContent = (ones / Math.max(zeros, 1)).toFixed(4);
}

async function generateBits() {
  const btn = document.getElementById('generateBtn');
  const count = parseInt(document.getElementById('bitCount').value);
  const source = document.getElementById('sourceSelect').value;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  document.getElementById('bitstream').textContent = '';
  try {
    const data = await apiCall('/generate', {
      method: 'POST',
      body: JSON.stringify({ bits: count, source }),
    });
    updateBitStream(data.bits);
  } catch (err) {
    document.getElementById('bitstream').textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate';
  }
}

async function runTests() {
  const btn = document.getElementById('runTestsBtn');
  const count = parseInt(document.getElementById('testBitCount').value);
  btn.disabled = true;
  btn.textContent = 'Running...';
  try {
    const data = await apiCall('/test', {
      method: 'POST',
      body: JSON.stringify({ bits: count }),
    });
    renderTestResults(data);
    updateEntropyMeter(data);
    updateTestChart(data);
  } catch (err) {
    document.getElementById('testResults').innerHTML = `<div class="test-item"><div class="test-status fail">ERROR</div><div class="test-name">${err.message}</div></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Tests';
  }
}

function renderTestResults(result) {
  const container = document.getElementById('testResults');
  container.innerHTML = '';
  for (const test of result.results) {
    const div = document.createElement('div');
    div.className = 'test-item';
    div.innerHTML = `
      <div class="test-status ${test.passed ? 'pass' : 'fail'}">${test.passed ? 'PASS' : 'FAIL'}</div>
      <div class="test-name">${test.name}</div>
      <div class="test-stat">Statistic: ${test.statistic.toFixed(6)}${test.pValue !== null ? ` | p-value: ${test.pValue.toFixed(6)}` : ''}</div>
    `;
    container.appendChild(div);
  }
}

function updateEntropyMeter(result) {
  const entropyTest = result.results.find(r => r.name.includes('Entropy'));
  if (entropyTest) {
    const val = Math.min(Math.max(entropyTest.statistic, 0), 1);
    document.getElementById('entropyFill').style.width = `${val * 100}%`;
    document.getElementById('entropyValue').textContent = val.toFixed(4);
  } else {
    const passed = result.results.filter(r => r.passed).length;
    const total = result.results.length;
    const ratio = passed / total;
    document.getElementById('entropyFill').style.width = `${ratio * 100}%`;
    document.getElementById('entropyValue').textContent = ratio.toFixed(4);
  }
}

async function encryptMessage() {
  const message = document.getElementById('messageInput').value;
  if (!message) return;
  const btn = document.getElementById('encryptBtn');
  btn.disabled = true;
  btn.textContent = 'Encrypting...';
  try {
    const data = await apiCall('/encrypt', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    document.getElementById('resultKey').textContent = data.encryptionKey.slice(0, 32) + '...';
    document.getElementById('resultCiphertext').textContent = data.encrypted.ciphertext.slice(0, 48) + '...';
    document.getElementById('resultAuthTag').textContent = data.encrypted.authTag;
    document.getElementById('resultDecrypted').textContent = data.decrypted;
    const integrityEl = document.getElementById('resultIntegrity');
    integrityEl.textContent = data.match ? 'PASS' : 'FAIL';
    integrityEl.className = data.match ? 'pass' : 'fail';
  } catch (err) {
    document.getElementById('resultDecrypted').textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Encrypt';
  }
}

async function checkStatus() {
  try {
    const data = await apiCall('/health');
    if (!data.ok) throw new Error('not ok');
    const dot = document.getElementById('statusDot');
    dot.className = 'status-dot online';
    document.getElementById('statusText').textContent = 'Online';
    const status = await apiCall('/status');
    document.getElementById('qiskitBackend').textContent = status.qiskitConfigured ? 'Configured' : 'Not configured';
    document.getElementById('qiskitStatus').textContent = status.qiskitConfigured ? 'Ready' : 'Simulator only';
  } catch (err) {
    const dot = document.getElementById('statusDot');
    dot.className = 'status-dot error';
    document.getElementById('statusText').textContent = 'Disconnected';
  }
}

async function listQiskitBackends() {
  try {
    const data = await apiCall('/qiskit/backends');
    if (!data.configured) {
      document.getElementById('qiskitBackend').textContent = 'Not configured';
      return;
    }
    document.getElementById('qiskitBackend').textContent = (data.backends || []).join(', ') || 'None available';
  } catch {}
}

function toggleStream() {
  const btn = document.getElementById('streamBtn');
  if (streaming) {
    streaming = false;
    clearInterval(streamInterval);
    btn.textContent = 'Start Stream';
    btn.className = 'btn btn-secondary';
  } else {
    streaming = true;
    btn.textContent = 'Stop Stream';
    btn.className = 'btn btn-primary';
    generateBits();
    streamInterval = setInterval(generateBits, 2000);
  }
}

document.getElementById('generateBtn').addEventListener('click', generateBits);
document.getElementById('runTestsBtn').addEventListener('click', runTests);
document.getElementById('encryptBtn').addEventListener('click', encryptMessage);
document.getElementById('streamBtn').addEventListener('click', toggleStream);

setInterval(checkStatus, 10000);
checkStatus();
listQiskitBackends();
