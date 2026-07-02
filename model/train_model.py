# %% [markdown]
# # Hate Speech & Offensive Language Classifier Training
# This notebook is designed to run in Google Colab. 
# It loads the cleaned dataset, trains a Logistic Regression classifier using TF-IDF, evaluates it, and exports the model as a lightweight JSON file that can be loaded directly into a JavaScript Chrome Extension with zero dependencies.

# %%
# 1. Imports
import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

# %% [markdown]
# ## 2. Load the Dataset
# If you are running this in Google Colab, you will need to upload your `cleaned_data.csv` first.
# You can do this by clicking the folder icon on the left sidebar and clicking "Upload".

# %%
# Load data (change path if necessary)
try:
    import os
    local_path = os.path.join("..", "data", "cleaned_data.csv")
    if os.path.exists(local_path):
        df = pd.read_csv(local_path)
    else:
        df = pd.read_csv("cleaned_data.csv")
    print(f"Dataset loaded successfully! Total records: {len(df)}")
except FileNotFoundError:
    print("Error: cleaned_data.csv not found. Please place it in ../data/ or upload it to your Colab directory.")

# Drop any rows with NaN tweets
df = df.dropna(subset=['tweet'])

# %% [markdown]
# ## 3. Analyze Class Balance
# Class 0: Hate Speech (target-directed)
# Class 1: Offensive Language (vulgarity/swearing)
# Class 2: Neither (neutral/clean)

# %%
class_counts = df['class'].value_counts()
print("Class distribution:")
for cls, count in class_counts.items():
    label = {0: "Hate Speech", 1: "Offensive", 2: "Neither"}[cls]
    print(f"  {label} ({cls}): {count} ({count/len(df)*100:.2f}%)")

# %% [markdown]
# ## 4. Feature Extraction (TF-IDF Vectorization)
# We convert text into numerical TF-IDF vectors. We limit the features to the top 5,000 words 
# and use 1-to-2 n-grams (single words and double word combinations) to capture context.

# %%
vectorizer = TfidfVectorizer(max_features=12000, ngram_range=(1, 2), stop_words='english', sublinear_tf=True)

X = vectorizer.fit_transform(df['tweet'])
y = df['class'].values

# Split into train and test sets (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")

# %% [markdown]
# ## 5. Train the Model
# We will use Logistic Regression. It is fast, highly accurate for text classification, 
# and its parameters (coefficients) can be easily exported as JSON weights.
# We set `class_weight='balanced'` to automatically handle the severe class imbalance.

# %%
model = LogisticRegression(class_weight={0: 3.5, 1: 1.0, 2: 1.5}, C=2.0, max_iter=1000)
model.fit(X_train, y_train)

# %% [markdown]
# ## 6. Evaluate the Model
# Let's check how well the model performs on the test set.

# %%
y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["Hate Speech", "Offensive", "Neither"]))

# %% [markdown]
# ## 7. Export Model to JSON for JavaScript
# We will extract the TF-IDF vocabulary and the Logistic Regression weights (coefficients and intercepts).
# This creates a zero-dependency model that can make predictions directly inside our Chrome Extension background script in milliseconds!

# %%
# Extract vocabulary mapping (word -> vector index) and convert values to native Python ints to prevent JSON serialization error
vocabulary = {word: int(idx) for word, idx in vectorizer.vocabulary_.items()}
# Inverse mapping (index -> word) is also useful, but we only need index to match vectorizer
vocab_list = [None] * len(vocabulary)
for word, idx in vocabulary.items():
    vocab_list[idx] = word

# Get IDF values
idf = vectorizer.idf_.tolist()

# Get model coefficients and intercept
# shape of coef_ is (n_classes, n_features)
coefficients = model.coef_.tolist()
intercept = model.intercept_.tolist()

# Save everything into a single JSON model package
model_package = {
    "vocabulary": vocabulary,
    "idf": idf,
    "coefficients": coefficients,
    "intercept": intercept,
    "classes": [0, 1, 2]
}

# Write to file
with open("model_weights.json", "w") as f:
    json.dump(model_package, f)

print("Model successfully exported to model_weights.json!")
print("Download this file from Colab and place it in your extension directory.")
