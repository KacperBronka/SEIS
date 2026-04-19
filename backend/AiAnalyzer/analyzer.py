"""
analyzer.py — Fraud detection scheduler
Runs every 12 hours, analyzes last 7 days of user activity from MySQL,
saves flagged users to timestamped CSV files.

Usage:
    python3 analyzer.py

Dependencies:
    pip install pandas scikit-learn joblib schedule mysql-connector-python

config.json format:
    {
        "host": "192.168.1.x",
        "port": 3307,
        "user": "your_user",
        "password": "your_password",
        "database": "your_database"
    }
"""

import os
import json
import logging
import joblib
import schedule
import time
import pandas as pd
import mysql.connector
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONFIG_PATH    = "config.json"
MODEL_PATH     = "model.pkl"
OUTPUT_DIR     = "scan_results"
LOOKBACK_DAYS  = 7
SCHEDULE_HOURS = 12

# Thresholds that trigger flagging + reason labels
REASONS = {
    "high_failure_rate":         lambda f: f["success_rate"] < 0.5,
    "burst_login_pattern":       lambda f: f["avg_interval"] < 130 and f["std_interval"] < 20,
    "many_consecutive_failures": lambda f: f["max_consecutive_failures"] >= 5,
    "unusually_high_volume":     lambda f: f["total_events"] > 40,
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("analyzer.log"),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

def load_config(path: str) -> dict:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Config file not found: {path}\n"
            "Create config.json with keys: host, port, user, password, database"
        )
    with open(path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    required = {"host", "port", "user", "password", "database"}
    missing = required - cfg.keys()
    if missing:
        raise KeyError(f"Missing keys in config.json: {missing}")

    return cfg

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def fetch_recent_events(cfg: dict, lookback_days: int) -> pd.DataFrame:
    """
    Fetches activity records from MySQL for the last `lookback_days` days.
    Table: activity (id, user_id, date, token, verification_successful)
    """
    cutoff = datetime.now() - timedelta(days=lookback_days)

    query = """
        SELECT
            user_id,
            date                    AS timestamp,
            verification_successful AS success
        FROM activity
        WHERE date >= %s
        ORDER BY user_id, date
    """

    try:
        conn = mysql.connector.connect(
            host     = cfg["host"],
            port     = int(cfg["port"]),
            user     = cfg["user"],
            password = cfg["password"],
            database = cfg["database"],
        )
        df = pd.read_sql(query, conn, params=(cutoff,))
        conn.close()

    except mysql.connector.Error as e:
        log.error("MySQL connection error: %s", e)
        raise

    # BIT columns come back as bytes in some driver versions — normalize to bool
    df["success"] = df["success"].apply(
        lambda v: bool(v[0]) if isinstance(v, (bytes, bytearray)) else bool(v)
    )
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    return df

# ---------------------------------------------------------------------------
# Feature extraction  (identical to main.py)
# ---------------------------------------------------------------------------

def extract_features(df: pd.DataFrame):
    rows     = []
    user_ids = []

    for uid, g in df.groupby("user_id"):
        g     = g.sort_values("timestamp")
        diffs = g["timestamp"].diff().dt.total_seconds().dropna()

        avg          = diffs.mean() if len(diffs) else 0
        std          = diffs.std()  if len(diffs) else 0
        total        = len(g)
        success_rate = g["success"].mean()

        max_fail = cur = 0
        for val in g["success"]:
            if not val:
                cur += 1
                max_fail = max(max_fail, cur)
            else:
                cur = 0

        rows.append([avg, std, total, success_rate, max_fail])
        user_ids.append(uid)

    feature_df = pd.DataFrame(
        rows,
        columns=["avg_interval", "std_interval", "total_events",
                 "success_rate", "max_consecutive_failures"],
    )
    return feature_df, user_ids

# ---------------------------------------------------------------------------
# Reason detection
# ---------------------------------------------------------------------------

def detect_reasons(feature_row: pd.Series) -> str:
    triggered = [label for label, check in REASONS.items() if check(feature_row)]
    return " | ".join(triggered) if triggered else "model_score_only"

# ---------------------------------------------------------------------------
# Core scan
# ---------------------------------------------------------------------------

def run_scan(cfg: dict, model):
    log.info("=== Starting scan ===")

    # 1. Fetch data from MySQL
    try:
        df = fetch_recent_events(cfg, LOOKBACK_DAYS)
    except Exception as e:
        log.error("Failed to fetch data: %s — skipping scan.", e)
        return

    if df.empty:
        log.warning("No events in the last %d days — skipping.", LOOKBACK_DAYS)
        return

    log.info("Fetched %d events for %d users.", len(df), df["user_id"].nunique())

    # 2. Extract features
    features, user_ids = extract_features(df)

    # 3. Predict
    probabilities = model.predict_proba(features)[:, 1]
    predictions   = model.predict(features)

    # 4. Build results for flagged users only
    records       = []
    flagged_count = 0

    for i, (uid, prob, pred) in enumerate(zip(user_ids, probabilities, predictions)):
        if pred == 1:
            flagged_count += 1
            reason = detect_reasons(features.iloc[i])
            records.append({
                "user_id":     uid,
                "probability": round(float(prob), 4),
                "reason":      reason,
                "flagged_at":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })

    log.info("Flagged %d / %d users.", flagged_count, len(user_ids))

    # 5. Save CSV
    if not records:
        log.info("No flagged users — no CSV written.")
        log.info("=== Scan complete ===\n")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path  = os.path.join(OUTPUT_DIR, f"scan_{timestamp}.csv")

    result_df = pd.DataFrame(records, columns=["user_id", "probability", "reason", "flagged_at"])
    result_df.to_csv(out_path, index=False, encoding="utf-8")

    log.info("Results saved to %s (%d records).", out_path, len(result_df))
    log.info("=== Scan complete ===\n")

# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------

def main():
    # Load config
    try:
        cfg = load_config(CONFIG_PATH)
    except (FileNotFoundError, KeyError) as e:
        log.error("Config error: %s", e)
        return

    # Load model
    if not os.path.exists(MODEL_PATH):
        log.error("Model file not found: %s", MODEL_PATH)
        return
    model = joblib.load(MODEL_PATH)

    log.info("Fraud detection scheduler starting.")
    log.info("MySQL: %s:%s / %s", cfg["host"], cfg["port"], cfg["database"])
    log.info("Scan interval  : every %d hours", SCHEDULE_HOURS)
    log.info("Lookback window: last %d days", LOOKBACK_DAYS)
    log.info("Output directory: %s/", OUTPUT_DIR)

    # Run immediately on startup, then on schedule
    run_scan(cfg, model)
    schedule.every(SCHEDULE_HOURS).hours.do(run_scan, cfg=cfg, model=model)
    log.info("Next scan in %d hours. Press Ctrl+C to stop.\n", SCHEDULE_HOURS)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()