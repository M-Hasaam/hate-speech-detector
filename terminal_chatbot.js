const readline = require('readline');
const { HF_MODEL_ID, loadClassifier, classifyText } = require('./model_engine');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'sentence> '
});

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
      const result = await classifyText(sentence);

      console.log(`Result: ${result.verdict}`);
      console.log(`Label: ${result.label}`);
      console.log(`Score: ${(result.score * 100).toFixed(2)}%`);
      console.log(`Model: ${result.model}`);
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