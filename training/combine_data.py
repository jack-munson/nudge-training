import pandas as pd

dataset1 = "data345.json"
dataset2 = "data6.json"

df1 = pd.read_json(dataset1)
df2 = pd.read_json(dataset2)
df = pd.concat([df1, df2], ignore_index = True)
df.to_json('data3456.json', orient='records')