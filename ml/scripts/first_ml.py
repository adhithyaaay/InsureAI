import pandas as pd

df = pd.read_csv("../dataset/insurance.csv")

print(df.groupby("smoker")["charges"].mean())