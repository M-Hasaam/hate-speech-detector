# Antigravity Agent Rules & Context Memory

This file defines the project context and agent instructions for the Chrome Extension Hate Speech Detector workspace.

## Project Context
*   **Goal:** Build a Chrome Extension to detect and filter/moderate hate speech and offensive content from social media platforms (Twitter/X, Instagram, WhatsApp Web).
*   **Dataset:** We are using a dataset of ~24k records (Davidson et al.).
    *   `labeled_data.csv`: Original raw dataset.
    *   `cleaned_data.csv`: Cleaned dataset (URLs, mentions, and HTML entities removed).
    *   **Class Labels:**
        *   `0`: Hate Speech (Targeted harassment/discrimination).
        *   `1`: Offensive Language (Vulgarity, casual swearing, insults).
        *   `2`: Neither (Clean/Neutral text).

## Developer & Agent Guidelines
*   **Aesthetics:** If any user interface (popup, options page) is built, use a highly modern, polished, and vibrant design.
*   **Logic Pipeline:** Prefer a hybrid logic setup:
    1.  Lightweight local regex/keywords (Sets) for instant flagging of unambiguous terms.
    2.  An advanced NLP evaluator (like Jigsaw's Perspective API, Google Gemini, or a lightweight web-based ML model) for context-aware classification.
*   **Extension Version:** Chrome Extension Manifest V3.

## Context Memory & Development Notes
*   **Folder Renaming:** The project is being renamed from `extension` to `hate-speech-detector`. After renaming the directory on disk, the user will reopen it in their IDE.
*   **Model Training Setup:**
    *   The model training script [train_model.py](file:///d:/CODE/extension/train_model.py) is designed for Google Colab (pre-configured with `numpy`, `pandas`, and `scikit-learn`).
    *   To run it locally instead, install Python, create a virtual environment (`python -m venv .venv`), activate it, and run `pip install numpy pandas scikit-learn`.

