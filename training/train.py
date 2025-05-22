import tensorflow as tf
import tensorflowjs as tfjs
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

dataset = "data3456.json"

df = pd.read_json(dataset)
print(df.head())

df['label'] = df['label'].map({"focused": 0, "distracted": 1})
print(df.head())

x = np.array(df['features'].tolist())
y = np.array(df['label'])

x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size = 0.2, random_state = 99
)

model = tf.keras.Sequential()

model.add(tf.keras.layers.Dense(units = 216, activation = 'relu', input_shape = [4]))
model.add(tf.keras.layers.Dense(units = 128, activation = 'relu'))
model.add(tf.keras.layers.Dense(units = 64, activation = 'relu'))
model.add(tf.keras.layers.Dense(units = 1, activation = 'sigmoid'))

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

model.fit(
    x_train, y_train,
    validation_data=(x_test, y_test),
    epochs=100,
    batch_size=32,
    verbose=1
)

loss, accuracy = model.evaluate(x_test, y_test)
print(f"Test accuracy: {accuracy:.4f}")

model.save("model2.h5")
#tfjs.converters.save_keras_model(model, "tfjs")
