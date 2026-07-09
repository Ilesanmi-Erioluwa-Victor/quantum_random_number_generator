let testChartInstance = null;
let entropyChartInstance = null;
let historyChartInstance = null;

function updateTestChart(result) {
  const ctx = document.getElementById('testChart').getContext('2d');
  if (testChartInstance) testChartInstance.destroy();

  const labels = result.results.map(r => r.name.split(' ').slice(0, 3).join(' '));
  const pValues = result.results.map(r => r.pValue !== null ? r.pValue : 0.5);
  const colors = result.results.map(r => {
    if (r.pValue === null) return 'rgba(100, 180, 255, 0.6)';
    return r.passed ? 'rgba(76, 175, 80, 0.6)' : 'rgba(244, 67, 54, 0.6)';
  });

  testChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'p-value',
        data: pValues,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.6', '1')),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Randomness Test p-values', color: '#78909c', font: { size: 12 } },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          grid: { color: '#1e3a5f' },
          ticks: { color: '#78909c' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#78909c', font: { size: 10 } },
        },
      },
      animation: { duration: 500 },
    },
  });
}

function updateEntropyChart(bits) {
  const ctx = document.getElementById('entropyChart').getContext('2d');
  if (entropyChartInstance) entropyChartInstance.destroy();

  const byteCounts = new Array(16).fill(0);
  for (let i = 0; i < bits.length; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4 && i + j < bits.length; j++) {
      nibble = (nibble << 1) | bits[i + j];
    }
    byteCounts[nibble]++;
  }
  const labels = byteCounts.map((_, i) => i.toString(16).toUpperCase());

  entropyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Nibble Frequency',
        data: byteCounts,
        backgroundColor: 'rgba(79, 195, 247, 0.4)',
        borderColor: 'rgba(79, 195, 247, 0.8)',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Nibble Distribution', color: '#78909c', font: { size: 12 } },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#1e3a5f' },
          ticks: { color: '#78909c' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#78909c' },
        },
      },
      animation: { duration: 500 },
    },
  });
}

function updateHistoryChart(historyData) {
  const ctx = document.getElementById('historyChart').getContext('2d');
  if (historyChartInstance) historyChartInstance.destroy();

  if (!historyData || historyData.length === 0) {
    historyChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'No historical data', color: '#78909c', font: { size: 12 } },
        },
      },
    });
    return;
  }

  const labels = historyData.map(d => new Date(d.createdAt).toLocaleTimeString());
  const passRates = historyData.map(d => {
    if (!d.tests) return 0;
    return d.tests.filter(t => t.passed).length / d.tests.length;
  });

  historyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Test Pass Rate',
        data: passRates,
        borderColor: '#4fc3f7',
        backgroundColor: 'rgba(79, 195, 247, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Historical Randomness Test Pass Rate', color: '#78909c', font: { size: 12 } },
      },
      scales: {
        y: {
          min: 0, max: 1,
          grid: { color: '#1e3a5f' },
          ticks: { color: '#78909c' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#78909c', font: { size: 9 }, maxTicksLimit: 10 },
        },
      },
      animation: { duration: 500 },
    },
  });
}

async function loadHistory() {
  try {
    const data = await fetch('/api/history/tests?limit=20').then(r => r.json());
    updateHistoryChart(data);
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setInterval(loadHistory, 15000);
});
