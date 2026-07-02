const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'labeled_data.csv');
const outputPath = path.join(__dirname, 'cleaned_data.csv');

function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch (e) {
        return match;
      }
    });
}

function cleanTweet(text) {
  let cleaned = text;

  // 1. Decode HTML entities
  cleaned = decodeHtmlEntities(cleaned);

  // 2. Remove RT (Retweet) markers
  cleaned = cleaned.replace(/\bRT\b/gi, '');

  // 3. Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');

  // 4. Remove @ mentions
  cleaned = cleaned.replace(/@\w+/g, '');

  // 5. Clean up multiple runs of exclamations/questions
  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/\?{2,}/g, '?');

  // 6. Normalize and strip extra quotes
  cleaned = cleaned.replace(/""/g, ' ');
  cleaned = cleaned.replace(/"/g, "");
  cleaned = cleaned.replace(/^[“”"'`\s]+|[“”"'`\s]+$/g, '');

  // 7. Strip non-ASCII characters / emoji boxes (printable ASCII range)
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');

  // 8. Replace stray single quotes, colons, & and # markers with space/empty
  cleaned = cleaned.replace(/\s+'\s*|\s*'\s+/g, ' '); // remove hanging single quotes
  cleaned = cleaned.replace(/#/g, '');               // strip hashtag symbols
  cleaned = cleaned.replace(/&amp;|&/g, 'and');      // map ampersands to 'and'
  cleaned = cleaned.replace(/:/g, '');                // strip colons
  cleaned = cleaned.replace(/\.{2,}/g, ' ');          // strip double periods or ellipses

  // 9. Replace multiple whitespaces/newlines with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 10. Strip any remaining leading non-alphanumeric noise
  cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '');

  cleaned = cleaned.trim();

  // If the tweet has no letters or digits, discard it
  if (!/[a-zA-Z0-9]/.test(cleaned)) {
    return '';
  }

  return cleaned;
}

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

function processCSV() {
  console.log('Reading new dataset from local data folder...');
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: ${inputPath} not found!`);
    return;
  }

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split('\n');
  
  let inQuotes = false;
  let currentRow = '';
  const rawRows = [];

  // Parse lines, combining multi-line entries wrapped in quotes
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (!line && i === lines.length - 1) continue;

    if (!inQuotes) {
      currentRow = line;
    } else {
      currentRow += '\n' + line;
    }

    const matches = (line.match(/"/g) || []).length;
    if (matches % 2 !== 0) {
      inQuotes = !inQuotes;
    }

    if (!inQuotes) {
      rawRows.push(currentRow);
    }
  }

  console.log(`Parsed ${rawRows.length} total rows. Starting cleaning & extraction...`);

  const cleanedRows = [];
  cleanedRows.push('class,tweet'); // Output header mapping: class, tweet

  let emptyCount = 0;
  let hateCount = 0;
  let nothateCount = 0;
  let invalidCount = 0;

  rawRows.forEach(row => {
    const cols = parseCSVLine(row);
    
    // cols[5] is class, cols[6] is tweet text
    if (cols.length >= 7) {
      const text = cols[6];
      const classVal = parseInt(cols[5].trim(), 10);

      let cls = -1;
      if (classVal === 0 || classVal === 1) {
        cls = 1; // 1 = Hate Speech / Offensive (Block)
        hateCount++;
      } else if (classVal === 2) {
        cls = 0; // 0 = Not Hate / Clean (Allow)
        nothateCount++;
      } else {
        invalidCount++;
        return; // skip rows with unknown labels
      }

      // Clean the text
      const cleaned = cleanTweet(text);

      if (cleaned.length > 0) {
        // Escape quotes for CSV
        const csvEscapedTweet = cleaned.replace(/"/g, '""');
        cleanedRows.push(`${cls},"${csvEscapedTweet}"`);
      } else {
        emptyCount++;
      }
    } else {
      invalidCount++;
    }
  });

  console.log(`Writing cleaned dataset to ${outputPath}...`);
  fs.writeFileSync(outputPath, cleanedRows.join('\n'), 'utf8');
  console.log('Done!');
  console.log(`Cleaned rows written: ${cleanedRows.length - 1}`);
  console.log(`  - Hate/Offensive entries (Class 1): ${hateCount}`);
  console.log(`  - Not Hate entries (Class 0): ${nothateCount}`);
  console.log(`  - Skipped (empty text): ${emptyCount}`);
  console.log(`  - Skipped (invalid format/label): ${invalidCount}`);
}

processCSV();
