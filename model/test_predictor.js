const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ToxicityPredictor = require('./predictor');

const weightsPath = path.join(__dirname, '..', 'train', 'model_weights.json');

// Check if model weights exist
if (!fs.existsSync(weightsPath)) {
  console.log('\n===============================================================');
  console.log('⚠️  Error: model_weights.json not found in root train/ folder!');
  console.log('===============================================================');
  console.log('To run this test script, you need to:');
  console.log('1. Upload your "balanced_data.csv" to Google Colab.');
  console.log('2. Open the "train/train_model.py" script in Colab and execute it.');
  console.log('3. Download the generated "model_weights.json" file.');
  console.log('4. Place it inside the "train/" folder.');
  console.log('===============================================================\n');
  process.exit(1);
}

const predictor = new ToxicityPredictor(weightsPath);
console.log('✅ Classifier successfully loaded from train/model_weights.json!\n');

// Check if an argument was provided
const argText = process.argv.slice(2).join(' ');

if (argText) {
  // Single-shot prediction
  runPrediction(argText);
} else {
  // Start interactive CLI
  startInteractiveCLI();
}

function runPrediction(text) {
  const result = predictor.predict(text);
  console.log(`Input Text: "${text}"`);
  console.log(`Prediction: ${result.label} (Class ${result.class})`);
  console.log('Probabilities:');
  console.log(`  [0] Not Hate:     ${(result.probabilities[0] * 100).toFixed(2)}%`);
  console.log(`  [1] Hate Speech:  ${(result.probabilities[1] * 100).toFixed(2)}%`);
  console.log('--------------------------------------------------');
}

function startInteractiveCLI() {
  console.log('==================================================');
  console.log('   Interactive Hate Speech & Toxicity Classifier   ');
  console.log('==================================================');
  console.log('Type any message to classify. Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question('Enter text > ', (input) => {
      if (input.trim().toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      if (input.trim()) {
        console.log('');
        runPrediction(input);
      }
      prompt();
    });
  };

  prompt();
}
