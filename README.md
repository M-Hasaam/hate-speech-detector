# Chrome Extension Hate Speech Detector
Hasaam
This project is a Chrome extension designed to parse and moderate hate speech and toxic comments on social media platforms like Twitter/X, Instagram, and WhatsApp Web in real-time.

## Project Structure
*   `labeled_data.csv`: Raw, labeled social media training data.
*   `cleaned_data.csv`: The cleaned training dataset, preprocessed for machine learning.
*   `clean_dataset.js`: A Node.js utility script used to clean the raw data (decodes HTML entities, strips URLs, removes @user mentions and RT markers).

## Data Schema & Class Labels
The dataset classes in `cleaned_data.csv` represent human annotations:
*   **`0` = Hate Speech:** Targeted harassment, discrimination, or slurs targeting protected groups (race, religion, gender, sexual orientation, disability, etc.).
*   **`1` = Offensive Language:** Casual swearing, profanity, and general insults not targeted at protected classes.
*   **`2` = Neither:** Safe, clean, or neutral messages.

## Current Setup & Architecture Plan
For the detection engine, we planned a **Hybrid Tiered System**:
1.  **Tier 1 (Instant Matcher):** A local JavaScript `Set` and regular expressions to instantly catch high-confidence toxic words/slurs offline without lag.
2.  **Tier 2 (Context Evaluator):** An NLP model or API (like Google's free **Perspective API** or a lightweight TensorFlow.js model) to analyze full sentence context and catch subtle hate speech.

---

## How to Run the Cleaning Utility
If you update `labeled_data.csv` and want to rebuild the clean dataset:
```bash
node clean_dataset.js
```

## WorkStyle 2 people are working on this
in working state
