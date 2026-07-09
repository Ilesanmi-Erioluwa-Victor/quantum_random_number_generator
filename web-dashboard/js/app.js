const API_BASE = '/api';
let streaming = false;
let streamInterval = null;

async function apiCall(endpoint, options = {}) {
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return resp.json();
}

function updateBitStream(bits) {
  const el = document.getElementById('bitstream');
  const bitStr = bits.join('');
  el.textContent = bitStr;
  document.getElementById('statBits').textContent = bits.length;
  const ones = bits.filter(b => b === 1).length;
  const zeros = bits.length - ones;
  document.getElementById('statOnes').textContent = ones;
  document.getElementById('statZeros').textContent = zeros;
  document.getElementById('statRatio').textContent = (ones / Math.max(zeros, 1)).toFixed(4);
}

async function generateBits() {
  const count = parseInt(document.getElementById('bitCount').value);
  const source = document.getElementById('sourceSelect').value;
  const data = await apiCall('/generate', {
    method: 'POST',
    body: JSON.stringify({ bits: count, source }),
  });
  if (data.error) { console.error(data.error); return; }
  updateBitStream(data.bits);
}

async function runTests() {
  const count = parseInt(document.getElementById('testBitCount').value);
  const data = await apiCall('/test', {
    method: 'POST',
    body: JSON.stringify({ bits: count }),
  });
  if (data.error) { console.error(data.error); return; }
  renderTestResults(data);
  updateEntropyMeter(data);
  updateTestChart(data);
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
  const data = await apiCall('/encrypt', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  if (data.error) { console.error(data.error); return; }
  document.getElementById('resultKey').textContent = data.encryptionKey.slice(0, 32) + '...';
  document.getElementById('resultCiphertext').textContent = data.encrypted.ciphertext.slice(0, 48) + '...';
  document.getElementById('resultAuthTag').textContent = data.encrypted.authTag;
  document.getElementById('resultDecrypted').textContent = data.decrypted;
  const integrityEl = document.getElementById('resultIntegrity');
  integrityEl.textContent = data.match ? 'PASS' : 'FAIL';
  integrityEl.className = data.match ? 'pass' : 'fail';
}

async function checkStatus() {
  try {
    const data = await apiCall('/status');
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    dot.className = 'status-dot online';
    text.textContent = data.dbConnected ? 'Online' : 'Online (no DB)';
    document.getElementById('qiskitBackend').textContent = data.qiskitConfigured ? 'Configured' : 'Not configured';
    document.getElementById('qiskitStatus').textContent = data.qiskitConfigured ? 'Ready' : 'Simulator only';
  } catch (err) {
    document.getElementById('statusDot').className = 'status-dot error';
    document.getElementById('statusText').textContent = 'Error';
  }
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

checkStatus();
setInterval(checkStatus, 10000);
