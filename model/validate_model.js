const fs = require('fs');
const path = require('path');
const ToxicityPredictor = require('./predictor');

const weightsPath = path.join(__dirname, 'model_weights.json');
const csvPath = path.join(__dirname, '..', 'data', 'cleaned_data.csv');

if (!fs.existsSync(weightsPath)) {
  console.error('Error: model_weights.json not found!');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error('Error: cleaned_data.csv not found!');
  process.exit(1);
}

const predictor = new ToxicityPredictor(weightsPath);
console.log('✅ Classifier successfully loaded from model_weights.json!');

console.log('Reading and parsing cleaned_data.csv...');
const content = fs.readFileSync(csvPath, 'utf8');

// Parse CSV manually to handle quotes, commas, and newlines correctly
function parseCSV(text) {
  const rows = [];
  let index = 0;
  
  // Skip header "class,tweet"
  while (index < text.length && text[index] !== '\n') {
    index++;
  }
  if (text[index] === '\n') index++;
  
  while (index < text.length) {
    // 1. Read class label (0, 1, or 2)
    let classLabelStr = '';
    while (index < text.length && text[index] !== ',') {
      classLabelStr += text[index];
      index++;
    }
    
    if (index >= text.length) break;
    index++; // Skip comma
    
    // 2. Read tweet (wrapped in quotes)
    if (text[index] !== '"') {
      // Unquoted tweet, read till newline
      let tweet = '';
      while (index < text.length && text[index] !== '\r' && text[index] !== '\n') {
        tweet += text[index];
        index++;
      }
      if (classLabelStr.trim() !== '') {
        rows.push({
          class: parseInt(classLabelStr.trim(), 10),
          tweet: tweet.trim()
        });
      }
      // Skip newlines
      while (index < text.length && (text[index] === '\r' || text[index] === '\n')) {
        index++;
      }
      continue;
    }
    
    // If quoted, read till matching closing quote
    index++; // Skip opening quote
    let tweet = '';
    while (index < text.length) {
      if (text[index] === '"') {
        // Double quotes inside string -> escaped quote
        if (text[index + 1] === '"') {
          tweet += '"';
          index += 2;
        } else {
          // Closing quote
          index++;
          break;
        }
      } else {
        tweet += text[index];
        index++;
      }
    }
    
    if (classLabelStr.trim() !== '') {
      rows.push({
        class: parseInt(classLabelStr.trim(), 10),
        tweet: tweet.trim()
      });
    }
    
    // Skip remaining carriage return and newline characters
    while (index < text.length && (text[index] === '\r' || text[index] === '\n')) {
      index++;
    }
  }
  return rows;
}

const dataRows = parseCSV(content);
console.log(`Parsed ${dataRows.length} records from dataset. Running evaluations...\n`);

// Confusion matrix: [actual][predicted]
const confusionMatrix = [
  [0, 0, 0], // Actual Class 0 (Hate Speech)
  [0, 0, 0], // Actual Class 1 (Offensive)
  [0, 0, 0]  // Actual Class 2 (Neither)
];

const errors = []; // Log a few errors for analysis
let correctCount = 0;

dataRows.forEach(row => {
  const result = predictor.predict(row.tweet);
  const pred = result.class;
  const actual = row.class;
  
  if (actual >= 0 && actual <= 2 && pred >= 0 && pred <= 2) {
    confusionMatrix[actual][pred]++;
    if (pred === actual) {
      correctCount++;
    } else {
      if (errors.length < 15) {
        errors.push({
          tweet: row.tweet,
          actual: actual,
          predicted: pred,
          probs: result.probabilities
        });
      }
    }
  }
});

// Compute statistics
const labels = ['Hate Speech (0)', 'Offensive (1)', 'Neither (2)'];
console.log('========================================================================');
console.log('                      CONFUSION MATRIX');
console.log('========================================================================');
console.log('                   PREDICTED Class 0    PREDICTED Class 1    PREDICTED Class 2');
console.log(`ACTUAL Class 0:       ${confusionMatrix[0][0].toString().padEnd(20)}${confusionMatrix[0][1].toString().padEnd(21)}${confusionMatrix[0][2]}`);
console.log(`ACTUAL Class 1:       ${confusionMatrix[1][0].toString().padEnd(20)}${confusionMatrix[1][1].toString().padEnd(21)}${confusionMatrix[1][2]}`);
console.log(`ACTUAL Class 2:       ${confusionMatrix[2][0].toString().padEnd(20)}${confusionMatrix[2][1].toString().padEnd(21)}${confusionMatrix[2][2]}`);
console.log('========================================================================\n');

const total = dataRows.length;
const overallAccuracy = (correctCount / total) * 100;
console.log(`Overall Accuracy: ${overallAccuracy.toFixed(2)}% (${correctCount}/${total})\n`);

console.log('========================================================================');
console.log('                   DETAILED CLASS METRICS');
console.log('========================================================================');
for (let i = 0; i < 3; i++) {
  const actualTotal = confusionMatrix[i][0] + confusionMatrix[i][1] + confusionMatrix[i][2];
  const predictedTotal = confusionMatrix[0][i] + confusionMatrix[1][i] + confusionMatrix[2][i];
  
  const precision = predictedTotal > 0 ? (confusionMatrix[i][i] / predictedTotal) * 100 : 0;
  const recall = actualTotal > 0 ? (confusionMatrix[i][i] / actualTotal) * 100 : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  
  console.log(`Class ${labels[i]}:`);
  console.log(`  Support:   ${actualTotal} instances`);
  console.log(`  Precision: ${precision.toFixed(2)}%`);
  console.log(`  Recall:    ${recall.toFixed(2)}%`);
  console.log(`  F1-Score:  ${f1.toFixed(2)}%`);
  console.log('------------------------------------------------------------------------');
}

console.log('\n========================================================================');
console.log('                    SAMPLE MISCLASSIFICATIONS');
console.log('========================================================================');
errors.forEach((err, idx) => {
  console.log(`${idx + 1}. Tweet: "${err.tweet}"`);
  console.log(`   Actual Class:    ${labels[err.actual]}`);
  console.log(`   Predicted Class: ${labels[err.predicted]}`);
  console.log(`   Probabilities:   Hate: ${(err.probs[0]*100).toFixed(1)}% | Off: ${(err.probs[1]*100).toFixed(1)}% | Clean: ${(err.probs[2]*100).toFixed(1)}%`);
  console.log('------------------------------------------------------------------------');
});
