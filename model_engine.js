const HF_MODEL_ID = 'Xenova/toxic-bert';
const HATE_SCORE_THRESHOLD = 0.5;

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

async function classifyText(sentence) {
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
    model: HF_MODEL_ID,
    label,
    score,
    verdict: (isToxicLabel(label) && score >= HATE_SCORE_THRESHOLD) ? 'HATE' : 'NOT HATE'
  };
}

module.exports = {
  HF_MODEL_ID,
  loadClassifier,
  classifyText,
};
