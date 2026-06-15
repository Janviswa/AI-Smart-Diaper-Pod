import pandas as pd
import numpy as np

from sklearn.preprocessing import (
    StandardScaler,
    LabelEncoder
)

from sklearn.model_selection import train_test_split


def remove_outliers_iqr(df, columns):
    """
    Remove outliers using IQR method
    """

    for col in columns:

        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)

        IQR = Q3 - Q1

        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR

        df = df[
            (df[col] >= lower) &
            (df[col] <= upper)
        ]

    return df


def preprocess_data(csv_path):

    # ----------------------------------
    # Load Dataset
    # ----------------------------------

    df = pd.read_csv(csv_path)

    print("Original Shape :", df.shape)

    # ----------------------------------
    # Remove Duplicates
    # ----------------------------------

    df = df.drop_duplicates()

    # ----------------------------------
    # Handle Missing Values
    # ----------------------------------

    df = df.dropna()

    # ----------------------------------
    # Feature Columns
    # ----------------------------------

    feature_columns = [
        "moisture",
        "force",
        "temperature",
        "accel_x",
        "accel_y",
        "accel_z",
        "battery"
    ]

    # ----------------------------------
    # Remove Outliers
    # ----------------------------------

    df = remove_outliers_iqr(
        df,
        feature_columns
    )

    # ----------------------------------
    # Features & Labels
    # ----------------------------------

    X = df[feature_columns]

    y = df["label"]

    # ----------------------------------
    # Label Encoding
    # ----------------------------------

    label_encoder = LabelEncoder()

    y = label_encoder.fit_transform(y)

    # ----------------------------------
    # Feature Scaling
    # ----------------------------------

    scaler = StandardScaler()

    X_scaled = scaler.fit_transform(X)

    # ----------------------------------
    # Train Test Split
    # ----------------------------------

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print("Processed Shape :", X.shape)

    return (
        X_train,
        X_test,
        y_train,
        y_test,
        scaler,
        label_encoder
    )


if __name__ == "__main__":

    (
        X_train,
        X_test,
        y_train,
        y_test,
        scaler,
        label_encoder
    ) = preprocess_data("dataset.csv")

    print("Preprocessing Completed Successfully")
