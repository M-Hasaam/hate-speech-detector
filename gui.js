const textInput = document.getElementById('textInput');
const detectBtn = document.getElementById('detectBtn');
const sampleBtn = document.getElementById('sampleBtn');
const loading = document.getElementById('loading');
const verdictBadge = document.getElementById('verdictBadge');
const labelValue = document.getElementById('labelValue');
const scoreValue = document.getElementById('scoreValue');
const modelValue = document.getElementById('modelValue');

function setLoading(active) {
  loading.style.display = active ? 'block' : 'none';
  detectBtn.disabled = active;
  sampleBtn.disabled = active;
}

function setResult(result) {
  verdictBadge.textContent = result.verdict;
  verdictBadge.className = `badge ${result.verdict === 'HATE' ? 'bad' : 'good'}`;
  labelValue.textContent = result.label || '-';
  scoreValue.textContent = result.score != null ? `${(result.score * 100).toFixed(2)}%` : '-';
  modelValue.textContent = result.model || '-';
}

async function detect() {
  const text = textInput.value.trim();
  if (!text) {
    alert('Type a sentence first.');
    return;
  }

  setLoading(true);
  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Prediction failed');
    }

    setResult(data);
  } catch (error) {
    alert(error.message);
  } finally {
    setLoading(false);
  }
}

detectBtn.addEventListener('click', detect);
textInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    detect();
  }
});

sampleBtn.addEventListener('click', () => {
  textInput.value = 'you are disgusting';
  textInput.focus();
});

fetch('/api/model')
  .then((response) => response.json())
  .then((data) => {
    modelValue.textContent = data.model;
  })
  .catch(() => {
    modelValue.textContent = 'Unknown';
  });
