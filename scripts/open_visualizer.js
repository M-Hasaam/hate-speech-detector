const path = require('path');
const { exec } = require('child_process');

const modelPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@huggingface',
  'transformers',
  '.cache',
  'Xenova',
  'toxic-bert',
  'onnx',
  'model.onnx'
);

console.log('Open this model in Netron web viewer:');
console.log(modelPath);
console.log('A browser tab will open now. Drag and drop the ONNX file there.');

exec('start https://netron.app', { shell: true });