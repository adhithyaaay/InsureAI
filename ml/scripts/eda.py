import pandas as pd
import matplotlib.pyplot as plt

# Read dataset
df = pd.read_csv("../../dataset/insurance.csv")

# Scatter plot
plt.figure(figsize=(8,5))

plt.scatter(df["age"], df["charges"])

plt.title("Age vs Insurance Charges")
plt.xlabel("Age")
plt.ylabel("Charges")

plt.show()