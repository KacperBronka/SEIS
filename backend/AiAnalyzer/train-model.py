import random
import pandas as pd
from datetime import datetime, timedelta

from sklearn.ensemble import RandomForestClassifier
import joblib

# ----------- generate data -----------

def generate_user(user_id, suspicious=False):
    data = []
    current = datetime.now()

    for _ in range(random.randint(10, 50)):
        if suspicious:
            interval = random.choice([120, 125, 115])
            success = random.random() > 0.5
        else:
            interval = random.randint(60, 600)
            success = random.random() > 0.1

        current += timedelta(seconds=interval)

        data.append({
            "user_id": user_id,
            "timestamp": current,
            "success": success
        })

    return data


# ----------- feature extraction -----------

def extract(df):
    rows = []

    for uid, g in df.groupby("user_id"):
        g = g.sort_values("timestamp")

        diffs = g["timestamp"].diff().dt.total_seconds().dropna()

        avg = diffs.mean() if len(diffs) else 0
        std = diffs.std() if len(diffs) else 0

        total = len(g)
        success_rate = g["success"].mean()

        max_fail = 0
        cur = 0

        for val in g["success"]:
            if not val:
                cur += 1
                max_fail = max(max_fail, cur)
            else:
                cur = 0

        rows.append([avg, std, total, success_rate, max_fail])

    return pd.DataFrame(rows)


# ----------- dataset -----------

data = []
labels = []

for uid in range(300):
    suspicious = random.random() < 0.3
    data += generate_user(uid, suspicious)
    labels.append(int(suspicious))

df = pd.DataFrame(data)

X = extract(df)
y = labels[:len(X)]

# ----------- train -----------

model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# ----------- save -----------

joblib.dump(model, "model.pkl")

print("Model trained and saved")