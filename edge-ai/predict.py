"""
Lightweight Edge AI Inference Script

Performs real-time local prediction for learner cognitive state.
Accepts interaction features as JSON, computes Hesitation Index and feature vector,
and yields the calibrated learner state with confidence and explanation factors.

Example output:
{
  "state": "STRUGGLING",
  "confidence": 0.92,
  "topic": "Quadratic Equations",
  "hesitation_index": 0.74,
  "probabilities": { ... }
}
"""

import os
import sys
import json
import joblib
import numpy as np

from feature_engineering import build_feature_vector, IDX_TO_STATE, STATE_LABELS

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'selected_edge_model.joblib')
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler.joblib')

_cached_model = None
_cached_scaler = None


def get_inference_engine():
    global _cached_model, _cached_scaler
    if _cached_model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Trained edge model not found at {MODEL_PATH}. Run train.py first.")
        _cached_model = joblib.load(MODEL_PATH)
        if os.path.exists(SCALER_PATH):
            _cached_scaler = joblib.load(SCALER_PATH)
    return _cached_model, _cached_scaler


def predict_learner_state(interaction_payload: dict) -> dict:
    """
    Executes edge inference on raw interaction payload.
    """
    model, scaler = get_inference_engine()
    
    # 1. Extract feature vector
    vector = build_feature_vector(interaction_payload)
    X = vector.reshape(1, -1)
    
    # Scale if model expects normalized inputs
    if scaler is not None and (hasattr(model, 'coef_') or hasattr(model, 'hidden_layer_sizes')):
        X = scaler.transform(X)
        
    # 2. Model prediction & probabilities
    probs = model.predict_proba(X)[0]
    predicted_idx = int(np.argmax(probs))
    state_label = IDX_TO_STATE[predicted_idx]
    confidence = float(round(probs[predicted_idx], 2))
    
    prob_dict = {STATE_LABELS[i]: float(round(probs[i], 3)) for i in range(len(STATE_LABELS))}
    
    # 3. Explainable Factors
    hesitation = float(vector[-1]) # last element is hesitation_index
    correctness = float(vector[0])
    error_streak = int(vector[2])
    
    reasons = []
    if correctness == 0:
        if error_streak >= 2:
            reasons.append(f"{error_streak} consecutive incorrect answers on this concept")
        else:
            reasons.append("Incorrect answer submitted")
    else:
        reasons.append("Correct answer achieved")
        
    if hesitation >= 0.60:
        reasons.append(f"High cognitive hesitation index ({hesitation:.2f})")
    elif hesitation <= 0.25:
        reasons.append("Decisive response with rapid selection")
        
    if interaction_payload.get('option_switch_count', 0) >= 2:
        reasons.append(f"Answer switched {interaction_payload.get('option_switch_count')} times")
        
    return {
        "state": state_label,
        "confidence": confidence,
        "topic": interaction_payload.get("topic_name", "Academic Topic"),
        "hesitation_index": hesitation,
        "probabilities": prob_dict,
        "explanation_factors": reasons
    }


import select

if __name__ == '__main__':
    raw_input = None
    if len(sys.argv) > 1 and sys.argv[1] != '--demo':
        raw_input = sys.argv[1]
    elif select.select([sys.stdin], [], [], 0.0)[0]:
        raw_input = sys.stdin.read().strip()
        
    if not raw_input:
        # Demo testing sample
        sample = {
            "topic_name": "Quadratic Equations",
            "correctness": 0,
            "score": 0.0,
            "error_streak": 3,
            "response_delay_sec": 48.0,
            "time_to_first_action_sec": 9.2,
            "option_switch_count": 3,
            "backtrack_count": 2,
            "mouse_pause_count": 6,
            "hover_duration_sec": 14.5,
            "recent_accuracy": 0.25,
            "historical_accuracy": 0.50
        }
        res = predict_learner_state(sample)
        print(json.dumps(res, indent=2))
    else:
        payload = json.loads(raw_input)
        res = predict_learner_state(payload)
        print(json.dumps(res))
