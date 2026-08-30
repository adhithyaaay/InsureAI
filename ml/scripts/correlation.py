import pandas as pd

df = pd.read_csv("../../dataset/insurance.csv")

# Correlation of numeric columns
print(df.corr(numeric_only=True))