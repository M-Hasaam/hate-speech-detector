const fs = require('fs');
const path = require('path');

const SKLEARN_STOP_WORDS = new Set([
  "a", "about", "above", "across", "after", "afterwards", "again", "against", 
  "all", "almost", "alone", "along", "already", "also", "although", "always", 
  "am", "among", "amongst", "amoungst", "amount", "an", "and", "another", 
  "any", "anyhow", "anyone", "anything", "anyway", "anywhere", "are", "around", 
  "as", "at", "back", "be", "became", "because", "become", "becomes", 
  "becoming", "been", "before", "beforehand", "behind", "being", "below", 
  "beside", "besides", "between", "beyond", "bill", "both", "bottom", "but", 
  "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", 
  "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", 
  "each", "eg", "eight", "either", "eleven", "else", "elsewhere", "empty", 
  "enough", "etc", "even", "ever", "every", "everyone", "everything", 
  "everywhere", "except", "few", "fifteen", "fifty", "fill", "find", "fire", 
  "first", "five", "for", "former", "formerly", "forty", "found", "four", 
  "from", "front", "full", "further", "get", "give", "go", "had", "has", 
  "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", 
  "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", 
  "however", "hundred", "i", "ie", "if", "in", "inc", "indeed", "interest", 
  "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", 
  "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", 
  "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", 
  "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", 
  "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", 
  "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", 
  "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", 
  "over", "own", "part", "per", "perhaps", "please", "put", "rather", "re", 
  "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", 
  "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", 
  "some", "somehow", "someone", "something", "sometime", "sometimes", 
  "somewhere", "still", "such", "system", "take", "ten", "than", "that", 
  "the", "their", "theirs", "them", "themselves", "then", "thence", "there", 
  "thereafter", "thereby", "therefore", "therein", "thereupon", "these", 
  "they", "thick", "thin", "third", "this", "those", "though", "three", 
  "through", "throughout", "thru", "thus", "to", "together", "too", "top", 
  "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", 
  "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", 
  "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", 
  "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", 
  "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", 
  "with", "within", "without", "would", "yet", "you", "your", "yours", 
  "yourself", "yourselves"
]);

class ToxicityPredictor {
  constructor(modelWeightsPath) {
    this.loaded = false;
    this.vocabulary = {};
    this.idf = [];
    this.coefficients = [];
    this.intercept = [];
    this.vocabSize = 0;

    if (modelWeightsPath) {
      this.loadModel(modelWeightsPath);
    }
  }

  loadModel(modelWeightsPath) {
    try {
      const data = JSON.parse(fs.readFileSync(modelWeightsPath, 'utf8'));
      this.vocabulary = data.vocabulary;
      this.idf = data.idf;
      this.coefficients = data.coefficients;
      this.intercept = data.intercept;
      this.vocabSize = this.idf.length;
      this.loaded = true;
    } catch (e) {
      console.error('Failed to load model weights:', e);
      this.loaded = false;
    }
  }

  // Load from raw object (useful in browser environment)
  loadModelObject(data) {
    this.vocabulary = data.vocabulary;
    this.idf = data.idf;
    this.coefficients = data.coefficients;
    this.intercept = data.intercept;
    this.vocabSize = this.idf.length;
    this.loaded = true;
  }

  tokenizeAndGetNgrams(text) {
    if (!text) return [];
    
    // Normalize string: lowercase, extract alphanumeric words of length >= 2
    let tokens = text.toLowerCase().match(/[a-z0-9_]{2,}/g) || [];
    
    // Filter out English stop words to align with Python training TF-IDF vectorizer
    tokens = tokens.filter(token => !SKLEARN_STOP_WORDS.has(token));
    
    const ngrams = [];
    for (let i = 0; i < tokens.length; i++) {
      // 1-gram
      ngrams.push(tokens[i]);
      // 2-gram
      if (i < tokens.length - 1) {
        ngrams.push(tokens[i] + ' ' + tokens[i + 1]);
      }
    }
    return ngrams;
  }

  predict(text) {
    if (!this.loaded) {
      throw new Error('Predictor model not loaded. Call loadModel() first.');
    }

    const ngrams = this.tokenizeAndGetNgrams(text);
    
    // 1. Compute term frequency (TF) vector (sparse)
    const rawVector = {};
    const activeIndices = new Set();

    ngrams.forEach(ngram => {
      if (ngram in this.vocabulary) {
        const idx = this.vocabulary[ngram];
        rawVector[idx] = (rawVector[idx] || 0) + 1;
        activeIndices.add(idx);
      }
    });

    if (activeIndices.size === 0) {
      // No words matched vocabulary, return default/neutral classification
      return {
        class: 2, // Neither
        label: 'Neither',
        probabilities: [0.0, 0.0, 1.0],
        scores: [0.0, 0.0, 0.0]
      };
    }

    // 2. Compute TF-IDF values
    const tfidfVector = {};
    let l2Sum = 0;

    activeIndices.forEach(idx => {
      const val = rawVector[idx] * this.idf[idx];
      tfidfVector[idx] = val;
      l2Sum += val * val;
    });

    // 3. L2 Normalization
    const l2Norm = Math.sqrt(l2Sum);
    activeIndices.forEach(idx => {
      tfidfVector[idx] /= l2Norm;
    });

    // 4. Logistic Regression Scores (z = x*w + b)
    const numClasses = this.intercept.length;
    const scores = new Array(numClasses).fill(0);

    for (let c = 0; c < numClasses; c++) {
      let z = this.intercept[c];
      activeIndices.forEach(idx => {
        z += tfidfVector[idx] * this.coefficients[c][idx];
      });
      scores[c] = z;
    }

    // 5. Softmax calculation
    const maxScore = Math.max(...scores);
    const expScores = scores.map(s => Math.exp(s - maxScore)); // Stabilized softmax
    const sumExp = expScores.reduce((sum, val) => sum + val, 0);
    const probabilities = expScores.map(e => e / sumExp);

    // Get max probability class
    let maxIdx = 0;
    let maxProb = 0;
    probabilities.forEach((prob, idx) => {
      if (prob > maxProb) {
        maxProb = prob;
        maxIdx = idx;
      }
    });

    const labels = ['Hate Speech', 'Offensive Language', 'Neither'];

    return {
      class: maxIdx,
      label: labels[maxIdx],
      probabilities: probabilities,
      scores: scores
    };
  }
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToxicityPredictor;
}
// Export for browser usage
if (typeof window !== 'undefined') {
  window.ToxicityPredictor = ToxicityPredictor;
}
