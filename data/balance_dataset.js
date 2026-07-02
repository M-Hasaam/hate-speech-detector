const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'cleaned_data.csv');
const outputPath = path.join(__dirname, 'balanced_data.csv');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Fisher-Yates shuffle algorithm
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function balanceDataset() {
  console.log(`Reading cleaned dataset from: ${inputPath}`);
  if (!fs.existsSync(inputPath)) {
    console.error('Error: cleaned_data.csv not found! Please run clean_dataset.js first.');
    return;
  }

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split('\n');
  
  const class0Rows = []; // Not Hate (Allow)
  const class1Rows = []; // Hate/Offensive (Block)
  
  let header = 'class,tweet';

  // Parse lines (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // The class is the first character before the comma
    const firstCommaIndex = line.indexOf(',');
    if (firstCommaIndex === -1) continue;

    const classVal = line.substring(0, firstCommaIndex);
    if (classVal === '0') {
      class0Rows.push(line);
    } else if (classVal === '1') {
      class1Rows.push(line);
    }
  }

  console.log(`Original Distribution:`);
  console.log(`  - Class 0 (Not Hate): ${class0Rows.length} rows`);
  console.log(`  - Class 1 (Hate/Offensive): ${class1Rows.length} rows`);

  const targetCount = class0Rows.length;
  console.log(`Downsampling Class 1 to match Class 0 count (${targetCount} rows)...`);

  // Shuffle Class 1 rows and select the top 'targetCount' rows
  const shuffledClass1 = shuffle(class1Rows);
  const selectedClass1 = shuffledClass1.slice(0, targetCount);

  // Combine both sets
  const combinedRows = [...class0Rows, ...selectedClass1];
  
  // Shuffle the final dataset to mix Class 0 and Class 1 records
  const finalRows = shuffle(combinedRows);

  // Add the header back
  finalRows.unshift(header);

  console.log(`Writing balanced dataset to: ${outputPath}`);
  fs.writeFileSync(outputPath, finalRows.join('\n'), 'utf8');

  console.log('Done!');
  console.log(`Balanced Dataset Summary:`);
  console.log(`  - Total Rows: ${finalRows.length - 1}`);
  console.log(`  - Class 0 count: ${class0Rows.length}`);
  console.log(`  - Class 1 count: ${selectedClass1.length}`);
}

balanceDataset();
