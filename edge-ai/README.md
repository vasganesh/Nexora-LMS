# Edge AI Module: Self-Adaptive Personalized Learning Framework

This module powers the on-device / near-user edge intelligence for the Nexora LMS platform. It tracks real-time student interactions, computes a privacy-safe cognitive **Hesitation Index**, and classifies learners into one of 5 foundational states with calibrated confidence and explainability.

---

## 1. Five Learner States

| State | Definition | Primary Indicators |
|---|---|---|
| **PROGRESSING** | Steady, normal advancement | Moderate response times, standard accuracy (65-85%), normal hesitation. |
| **MASTERING** | High proficiency & conceptual fluency | Sustained accuracy (>85%), rapid decisive responses, low hesitation (<0.35). |
| **STRUGGLING** | Encountering conceptual barriers | Repeated errors (streak ≥ 2), high hesitation (≥0.60), multiple option switches. |
| **RECOVERING** | Rebound after difficulty | Accurate answer following struggling/forgetting state; stabilizing hesitation. |
| **FORGETTING** | Retention decay over time | High historical mastery followed by decay after an elapsed retention interval. |

---

## 2. Privacy-Safe Feature Vector (17 Features)

Raw $(x, y)$ cursor coordinates are **never** permanently stored or sent off-device. Only aggregate physical & cognitive metrics are retained:

1. `correctness` (0 or 1)
2. `score` (0.0 to 1.0)
3. `error_streak` (consecutive incorrect answers)
4. `time_spent_sec` (total question elapsed time)
5. `recent_accuracy` (rolling window of recent questions)
6. `historical_accuracy` (lifetime concept accuracy)
7. `hint_used` (0 or 1)
8. `attempt_count` (number of tries)
9. `response_delay_sec` (submission latency)
10. `time_to_first_action_sec` (latency before first interaction)
11. `option_switch_count` (frequency of changing selected answer)
12. `click_count` (total clicks within question area)
13. `hover_duration_sec` (time spent hovering over answer choices)
14. `mouse_distance_normalized` (total path length scaled)
15. `average_mouse_speed` (pixels/sec)
16. `mouse_pause_count` (pauses exceeding 800ms)
17. `hesitation_index` (derived cognitive uncertainty index, $0.0 \le H \le 1.0$)

---

## 3. Candidate Edge Models & Selection

Three lightweight architectures are benchmarked:
- **Logistic Regression**: High interpretability, linear baseline.
- **Random Forest**: Non-linear tree ensemble with tree depth constrained to limit RAM usage.
- **Small MLP**: Multi-layer perceptron $(32 \to 16)$ with early stopping.

Selection is determined by an **Edge Composite Score** factoring in:
- Macro-F1 score
- Inference latency ($< 5\text{ ms}$)
- Serialized model size on disk ($< 500\text{ KB}$)

---

## 4. How to Train & Evaluate

Install dependencies:
```bash
pip install -r edge-ai/requirements.txt
```

Train and benchmark all models:
```bash
python edge-ai/train.py
```

Run comprehensive evaluation & confusion matrix:
```bash
python edge-ai/evaluate.py
```

Run test inference:
```bash
python edge-ai/predict.py
```
