const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ToxicityPredictor = require('./predictor');

const weightsPath = path.join(__dirname, 'model_weights.json');

// Check if model weights exist
if (!fs.existsSync(weightsPath)) {
  console.log('\n===============================================================');
  console.log('⚠️  Error: model_weights.json not found in this folder!');
  console.log('===============================================================');
  console.log('To run this test script, you need to:');
  console.log('1. Upload your "cleaned_data.csv" to Google Colab.');
  console.log('2. Open the "train_model.py" script in Colab and execute the cells.');
  console.log('3. Download the generated "model_weights.json" file from Colab.');
  console.log('4. Place "model_weights.json" in this workspace folder.');
  console.log('===============================================================\n');
  process.exit(1);
}

const predictor = new ToxicityPredictor(weightsPath);
console.log('✅ Classifier successfully loaded from model_weights.json!\n');

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
  console.log(`  [0] Hate Speech:        ${(result.probabilities[0] * 100).toFixed(2)}%`);
  console.log(`  [1] Offensive Language: ${(result.probabilities[1] * 100).toFixed(2)}%`);
  console.log(`  [2] Neither (Clean):    ${(result.probabilities[2] * 100).toFixed(2)}%`);
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
