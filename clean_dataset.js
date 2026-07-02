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

  // 5. Replace multiple whitespaces/newlines with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 6. Trim leading/trailing spaces
  return cleaned.trim();
}

function processCSV() {
  console.log('Reading dataset...');
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: ${inputPath} not found!`);
    return;
  }

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split('\n');
  
  let inQuotes = false;
  let currentRow = '';
  const parsedRows = [];

  // Parse CSV correctly handling quoted newlines
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
      parsedRows.push(currentRow);
    }
  }

  console.log(`Parsed ${parsedRows.length} total rows. Starting cleaning...`);

  const cleanedRows = [];
  // Add header
  cleanedRows.push('class,tweet');

  let emptyCount = 0;

  parsedRows.forEach(row => {
    // Regex to match prefix columns: index,count,hate_speech,offensive_language,neither,class
    // e.g. "0,3,0,0,3,2,..."
    const match = row.match(/^[^,]+,\d+,\d+,\d+,\d+,(\d+),([\s\S]*)$/);
    if (match) {
      const cls = match[1];
      let tweet = match[2];

      // Remove outer quotes if present
      if (tweet.startsWith('"') && tweet.endsWith('"')) {
        tweet = tweet.slice(1, -1);
      }
      // Unescape double-double quotes ("" -> ")
      tweet = tweet.replace(/""/g, '"');

      // Clean the text
      const cleaned = cleanTweet(tweet);

      if (cleaned.length > 0) {
        // Escape quotes for CSV format
        const csvEscapedTweet = cleaned.replace(/"/g, '""');
        cleanedRows.push(`${cls},"${csvEscapedTweet}"`);
      } else {
        emptyCount++;
      }
    }
  });

  console.log(`Writing cleaned dataset to ${outputPath}...`);
  fs.writeFileSync(outputPath, cleanedRows.join('\n'), 'utf8');
  console.log('Done!');
  console.log(`Cleaned rows written: ${cleanedRows.length - 1}`);
  console.log(`Rows skipped because they became empty after cleaning: ${emptyCount}`);
}

processCSV();
