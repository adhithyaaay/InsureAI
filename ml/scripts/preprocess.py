import pandas as pd

# Load dataset
df = pd.read_csv("../../dataset/insurance.csv")

# Label Encoding
df["sex"] = df["sex"].map({
    "male": 1,
    "female": 0
})

df["smoker"] = df["smoker"].map({
    "yes": 1,
    "no": 0
})

# One-Hot Encoding
df = pd.get_dummies(df, columns=["region"], dtype=int)

print(df.head())