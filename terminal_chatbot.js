const readline = require('readline');

const HF_MODEL_ID = 'Xenova/toxic-bert';
const HATE_SCORE_THRESHOLD = 0.5;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'sentence> '
});

let classifier = null;

function isToxicLabel(label) {
  const normalized = String(label || '').toLowerCase();
  return (
    normalized.includes('toxic') ||
    normalized.includes('insult') ||
    normalized.includes('obscene') ||
    normalized.includes('threat') ||
    normalized.includes('identity_hate')
  );
}

async function loadClassifier() {
  if (classifier) {
    return classifier;
  }

  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowRemoteModels = true;
  env.allowLocalModels = true;
  classifier = await pipeline('text-classification', HF_MODEL_ID);
  return classifier;
}

async function classifyLocally(sentence) {
  const model = await loadClassifier();
  const result = await model(sentence, { topk: null });

  const rows = Array.isArray(result) ? result : [result];
  const topResult = rows.reduce((best, item) => {
    if (!best || (item.score ?? 0) > (best.score ?? 0)) return item;
    return best;
  }, null);

  const label = topResult?.label || 'unknown';
  const score = topResult?.score ?? 0;

  return {
    label,
    verdict: (isToxicLabel(label) && score >= HATE_SCORE_THRESHOLD) ? 'HATE' : 'NOT HATE',
    score,
    source: 'local-bert'
  };
}

async function main() {
  console.log('Terminal hate-speech checker loaded.');
  console.log(`Local model: ${HF_MODEL_ID}`);
  console.log('Type a sentence and press Enter. Type exit to quit.');
  console.log('Loading local BERT model (first run may take a while for download)...');

  try {
    await loadClassifier();
    console.log('Local BERT model ready.');
  } catch (error) {
    console.error(`Failed to load local model: ${error.message}`);
    rl.close();
    return;
  }

  rl.prompt();

  rl.on('line', async (line) => {
    const sentence = line.trim();

    if (!sentence) {
      rl.prompt();
      return;
    }

    if (sentence.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      const result = await classifyLocally(sentence);

      console.log(`Result: ${result.verdict}`);
      console.log(`Label: ${result.label}`);
      console.log(`Score: ${(result.score * 100).toFixed(2)}%`);
      console.log(`Model: ${result.source}`);
    } catch (error) {
      console.error(`Prediction error: ${error.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('Bye.');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});