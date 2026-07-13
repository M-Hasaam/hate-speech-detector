# Local BERT Hate-Speech Chatbot

This repo now contains only a terminal chatbot checker.

## Files

- `terminal_chatbot.js` - interactive CLI for hate/not-hate detection
- `package.json` - dependency list
- `package-lock.json` - locked dependency versions
- `.gitignore` - ignore rules

## Run

1. Install dependencies:

```bash
npm install
```

2. Start chatbot:

```bash
node terminal_chatbot.js
```

3. Type any sentence and press Enter.

4. Type `exit` to quit.

## Notes

- Model used locally: `Xenova/toxic-bert`
- First run downloads model files, so it can take some time.
- After first download, startup is much faster.
