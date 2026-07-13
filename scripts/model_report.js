const fs = require('fs');
const path = require('path');

const configPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@huggingface',
  'transformers',
  '.cache',
  'Xenova',
  'toxic-bert',
  'config.json'
);

const tokenizerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@huggingface',
  'transformers',
  '.cache',
  'Xenova',
  'toxic-bert',
  'tokenizer_config.json'
);

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const tokenizer = JSON.parse(fs.readFileSync(tokenizerPath, 'utf8'));

const labels = Object.entries(config.id2label)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([, label]) => label);

console.log('Model Report');
console.log('-------------');
console.log(`Model name: ${config._name_or_path}`);
console.log(`Architecture: ${config.architectures[0]}`);
console.log(`Layers: ${config.num_hidden_layers}`);
console.log(`Attention heads: ${config.num_attention_heads}`);
console.log(`Hidden size: ${config.hidden_size}`);
console.log(`Max tokens: ${config.max_position_embeddings}`);
console.log(`Problem type: ${config.problem_type}`);
console.log('Labels:');
labels.forEach((label, index) => console.log(`  ${index + 1}. ${label}`));
console.log(`Tokenizer class: ${tokenizer.tokenizer_class}`);
console.log(`Lower casing: ${tokenizer.do_lower_case}`);
console.log(`Model max length: ${tokenizer.model_max_length}`);