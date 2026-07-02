# %% [markdown]
# # Binary Hate Speech Classifier Training (Logistic Regression)
# This script trains a binary classifier to predict "Hate Speech" (1) vs "Not Hate" (0) using 
# TF-IDF Vectorization and Logistic Regression.
# It splits the dataset into 70% Training, 15% Validation, and 15% Testing, and exports 
# the weights in a Softmax-compatible format for client-side JavaScript.

# %%
# 1. Imports
import pandas as pd
import numpy as np
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

# %% [markdown]
# ## 2. Load the Dataset

# %%
# Load data (change path if necessary)
try:
    # Resolve relative path from model/train/ folder
    local_path = os.path.join("..", "..", "data", "cleaned_data.csv")
    if os.path.exists(local_path):
        df = pd.read_csv(local_path)
    else:
        df = pd.read_csv("cleaned_data.csv")
    print(f"Dataset loaded successfully! Total records: {len(df)}")
except FileNotFoundError:
    print("Error: cleaned_data.csv not found. Please place it in ../../data/ or upload it to your workspace.")

# Drop any rows with NaN tweets
df = df.dropna(subset=['tweet'])

# %% [markdown]
# ## 3. Analyze Class Balance
# Class 0: Not Hate (Clean/Neutral)
# Class 1: Hate Speech

# %%
class_counts = df['class'].value_counts()
print("Class distribution:")
for cls, count in class_counts.items():
    label = {0: "Not Hate", 1: "Hate Speech"}[cls]
    print(f"  {label} ({cls}): {count} ({count/len(df)*100:.2f}%)")

# %% [markdown]
# ## 4. Feature Extraction (TF-IDF Vectorization)
# Convert text to numerical TF-IDF vectors using 1-to-2 n-grams.
# We limit features to top 12,000 words to match the extension capacity.

# %%
vectorizer = TfidfVectorizer(max_features=12000, ngram_range=(1, 2), stop_words='english', sublinear_tf=True)

X = vectorizer.fit_transform(df['tweet'])
y = df['class'].values

# Split into train and remaining temp pools (70% train, 30% temp)
X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)

# Split temp pool in half (15% validation, 15% test)
X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)

print(f"Train size: {X_train.shape[0]}, Validation size: {X_val.shape[0]}, Test size: {X_test.shape[0]}")

# %% [markdown]
# ## 5. Train the Model
# We will use Logistic Regression. C=2.0 helps prevent overfitting.
# We set class_weight='balanced' to handle any slight class imbalance.

# %%
model = LogisticRegression(class_weight='balanced', C=2.0, max_iter=1000)
model.fit(X_train, y_train)

# %% [markdown]
# ## 6. Evaluate the Model
# Evaluate on the validation set first, then verify on the test set.

# %%
print("\n=== Validation Set Evaluation ===")
y_val_pred = model.predict(X_val)
print("Validation Accuracy:", accuracy_score(y_val, y_val_pred))
print("\nClassification Report (Validation):")
print(classification_report(y_val, y_val_pred, target_names=["Not Hate", "Hate Speech"]))

print("\n=== Test Set Evaluation ===")
y_test_pred = model.predict(X_test)
print("Test Accuracy:", accuracy_score(y_test, y_test_pred))
print("\nClassification Report (Test):")
print(classification_report(y_test, y_test_pred, target_names=["Not Hate", "Hate Speech"]))

print("\n=== Confusion Matrix (Validation) ===")
print(confusion_matrix(y_val, y_val_pred))

print("\n=== Confusion Matrix (Test) ===")
print(confusion_matrix(y_test, y_test_pred))

# %% [markdown]
# ## 6.1. Visualize Logistic Regression Model Coefficients & Sigmoid Probability Curve
# We plot the top words that drive predictions and visualize the distribution of prediction confidence.

# %%
# Extract top words with highest and lowest coefficients
feature_names = np.array(vectorizer.get_feature_names_out())
coefs = model.coef_[0]
sorted_coef_indices = np.argsort(coefs)

top_not_hate_words = feature_names[sorted_coef_indices[:15]]
top_not_hate_coefs = coefs[sorted_coef_indices[:15]]

top_hate_words = feature_names[sorted_coef_indices[-15:]]
top_hate_coefs = coefs[sorted_coef_indices[-15:]]

print("\nTop 15 words predicting 'Not Hate':")
for word, coef in zip(top_not_hate_words, top_not_hate_coefs):
    print(f"  {word}: {coef:.4f}")

print("\nTop 15 words predicting 'Hate Speech':")
for word, coef in zip(top_hate_words[::-1], top_hate_coefs[::-1]):
    print(f"  {word}: {coef:.4f}")

# Plotting the Logistic Regression Coefficients
plt.figure(figsize=(14, 6))
plt.subplot(1, 2, 1)
plt.barh(top_not_hate_words, top_not_hate_coefs, color='green')
plt.title("Top Words for 'Not Hate'")
plt.xlabel("Coefficient Weight")

plt.subplot(1, 2, 2)
plt.barh(top_hate_words, top_hate_coefs, color='red')
plt.title("Top Words for 'Hate Speech'")
plt.xlabel("Coefficient Weight")
plt.tight_layout()
plt.savefig("logistic_coefficients.png")
plt.show()

# Plot Sigmoid Curve / Prediction Probabilities Distribution
y_val_probs = model.predict_proba(X_val)[:, 1] # Probability of Class 1 (Hate)
plt.figure(figsize=(8, 5))
plt.hist(y_val_probs[y_val == 0], bins=30, alpha=0.6, label='Actual Not Hate', color='blue')
plt.hist(y_val_probs[y_val == 1], bins=30, alpha=0.6, label='Actual Hate Speech', color='red')
plt.axvline(0.5, color='black', linestyle='--', label='Default Sigmoid Threshold (0.5)')
plt.title("Distribution of Logistic Sigmoid Probabilities")
plt.xlabel("Probability of Hate Speech")
plt.ylabel("Frequency")
plt.legend()
plt.savefig("logistic_probability_curve.png")
plt.show()

# %% [markdown]
# ## 7. Export Model to JSON for JavaScript Softmax Predictor
# We map the 1D binary Logistic Regression weights into a 2D matrix 
# representing 2 classes to maintain complete compatibility with predictor.js.

# %%
# Extract vocabulary mapping (word -> vector index) and cast values to native Python ints
vocabulary = {word: int(idx) for word, idx in vectorizer.vocabulary_.items()}

# Get IDF values
idf = vectorizer.idf_.tolist()

# Binary regression outputs coefficients of shape (1, n_features) and intercept of shape (1,)
coef_raw = model.coef_[0].tolist()
intercept_raw = float(model.intercept_[0])

# Map to 2 classes to support the JavaScript Softmax Predictor:
# Class 0 (Not Hate): Coefficients = all 0.0, Intercept = 0.0
# Class 1 (Hate Speech): Coefficients = actual model coefficients, Intercept = actual intercept
coefficients = [
    [0.0] * len(vocabulary),  # Class 0
    coef_raw                 # Class 1
]
intercept = [
    0.0,                     # Class 0
    intercept_raw            # Class 1
]

# Save everything into a single JSON model package
model_package = {
    "vocabulary": vocabulary,
    "idf": idf,
    "coefficients": coefficients,
    "intercept": intercept,
    "classes": [0, 1]
}

# Resolve file write destination
output_path = os.path.join(os.path.dirname(__file__), "model_weights.json")
with open(output_path, "w") as f:
    json.dump(model_package, f)

print(f"\nModel successfully exported to {output_path}!")
