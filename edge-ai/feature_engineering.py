"""
Feature Engineering Module for Edge AI Learner-State Inference

Transforms raw academic & privacy-safe aggregate interaction metrics into
normalized feature vectors for classification across 5 learner states:
- PROGRESSING (0)
- MASTERING (1)
- STRUGGLING (2)
- RECOVERING (3)
- FORGETTING (4)
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List

FEATURE_NAMES = [
    'correctness',
    'score',
    'error_streak',
    'time_spent_sec',
    'recent_accuracy',
    'historical_accuracy',
    'hint_used',
    'attempt_count',
    'response_delay_sec',
    'time_to_first_action_sec',
    'option_switch_count',
    'click_count',
    'hover_duration_sec',
    'mouse_distance_normalized',
    'average_mouse_speed',
    'mouse_pause_count',
    'hesitation_index'
]

STATE_LABELS = [
    'PROGRESSING',
    'MASTERING',
    'STRUGGLING',
    'RECOVERING',
    'FORGETTING'
]

STATE_TO_IDX = {s: i for i, s in enumerate(STATE_LABELS)}
IDX_TO_STATE = {i: s for i, s in enumerate(STATE_LABELS)}


def compute_hesitation_index(
    response_delay_sec: float,
    time_to_first_action_sec: float,
    option_switch_count: int,
    backtrack_count: int,
    mouse_pause_count: int,
    hover_duration_sec: float
) -> float:
    """
    Computes a normalized Hesitation Index (0.0 to 1.0)
    combining temporal delays, switching behavior, and hover ratios.
    """
    total_sec = max(1.0, response_delay_sec)
    
    latency_score = min(1.0, max(0.0, time_to_first_action_sec / 8.0))
    switch_score = min(1.0, option_switch_count / 4.0)
    backtrack_score = min(1.0, backtrack_count / 3.0)
    
    pauses_per_min = (mouse_pause_count / total_sec) * 60.0
    pause_score = min(1.0, pauses_per_min / 15.0)
    
    hover_ratio = min(1.0, hover_duration_sec / total_sec)
    
    hesitation = (
        0.25 * latency_score +
        0.25 * switch_score +
        0.20 * backtrack_score +
        0.15 * pause_score +
        0.15 * hover_ratio
    )
    
    return float(np.clip(np.round(hesitation, 3), 0.0, 1.0))


def build_feature_vector(raw_dict: Dict[str, Any]) -> np.ndarray:
    """
    Transforms a single interaction dictionary into the standard 1D feature array.
    Supports both camelCase and snake_case keys for seamless JS/Python interop.
    """
    def g(k_snake, k_camel, default=0.0):
        val = raw_dict.get(k_snake)
        if val is None:
            val = raw_dict.get(k_camel, default)
        return val

    resp_delay = float(g('response_delay_sec', 'responseDelaySec', 15.0))
    first_action = float(g('time_to_first_action_sec', 'timeToFirstActionSec', 3.0))
    opt_switches = int(g('option_switch_count', 'optionSwitchCount', 0))
    backtracks = int(g('backtrack_count', 'backtrackCount', 0))
    pauses = int(g('mouse_pause_count', 'mousePauseCount', 1))
    hover_sec = float(g('hover_duration_sec', 'hoverDurationSec', 2.0))
    
    hesitation = raw_dict.get('hesitation_index')
    if hesitation is None:
        hesitation = raw_dict.get('hesitationIndex')
    if hesitation is None:
        hesitation = compute_hesitation_index(
            resp_delay, first_action, opt_switches, backtracks, pauses, hover_sec
        )
    else:
        hesitation = float(hesitation)

    vector = [
        float(g('correctness', 'correctness', 1.0)),
        float(g('score', 'score', 1.0)),
        float(min(10, g('error_streak', 'errorStreak', 0))),
        float(g('time_spent_sec', 'timeSpentSec', resp_delay)),
        float(g('recent_accuracy', 'recentAccuracy', 0.8)),
        float(g('historical_accuracy', 'historicalAccuracy', 0.8)),
        float(g('hint_used', 'hintUsed', 0.0)),
        float(max(1, g('attempt_count', 'attemptCount', 1))),
        resp_delay,
        first_action,
        float(opt_switches),
        float(g('click_count', 'clickCount', 1)),
        hover_sec,
        float(min(1.0, g('mouse_distance_normalized', 'mouseDistanceNormalized', 0.3))),
        float(g('average_mouse_speed', 'averageMouseSpeed', 150.0)),
        float(pauses),
        hesitation
    ]
    return np.array(vector, dtype=np.float32)


def generate_benchmark_dataset(num_samples: int = 2500, random_seed: int = 42) -> Tuple[pd.DataFrame, np.ndarray]:
    """
    Generates a reproducible, grounded educational benchmark dataset
    modeling empirical cognitive distributions for the 5 learner states.
    Used for cold-start baseline training and model evaluation.
    """
    np.random.seed(random_seed)
    samples_per_state = num_samples // 5
    
    rows = []
    labels = []
    
    for state_idx, state_name in enumerate(STATE_LABELS):
        for _ in range(samples_per_state):
            if state_name == 'MASTERING':
                correctness = 1.0
                score = np.random.uniform(0.9, 1.0)
                error_streak = 0
                time_spent = np.random.uniform(4.0, 18.0)
                recent_acc = np.random.uniform(0.85, 1.0)
                hist_acc = np.random.uniform(0.85, 1.0)
                hint_used = 0.0
                attempt_count = 1
                first_action = np.random.uniform(0.8, 2.5)
                opt_switches = np.random.choice([0, 1], p=[0.9, 0.1])
                clicks = np.random.randint(1, 3)
                hover_sec = np.random.uniform(0.5, 3.0)
                mouse_dist = np.random.uniform(0.1, 0.4)
                mouse_speed = np.random.uniform(200.0, 500.0)
                pauses = np.random.randint(0, 2)
                
            elif state_name == 'PROGRESSING':
                correctness = np.random.choice([1.0, 0.0], p=[0.75, 0.25])
                score = correctness
                error_streak = 0 if correctness == 1.0 else 1
                time_spent = np.random.uniform(12.0, 35.0)
                recent_acc = np.random.uniform(0.65, 0.85)
                hist_acc = np.random.uniform(0.65, 0.85)
                hint_used = np.random.choice([0.0, 1.0], p=[0.85, 0.15])
                attempt_count = 1
                first_action = np.random.uniform(2.0, 5.0)
                opt_switches = np.random.choice([0, 1, 2], p=[0.65, 0.25, 0.10])
                clicks = np.random.randint(1, 4)
                hover_sec = np.random.uniform(2.0, 8.0)
                mouse_dist = np.random.uniform(0.2, 0.6)
                mouse_speed = np.random.uniform(120.0, 300.0)
                pauses = np.random.randint(1, 4)
                
            elif state_name == 'STRUGGLING':
                correctness = np.random.choice([0.0, 1.0], p=[0.85, 0.15])
                score = correctness
                error_streak = np.random.randint(2, 6)
                time_spent = np.random.uniform(35.0, 95.0)
                recent_acc = np.random.uniform(0.10, 0.45)
                hist_acc = np.random.uniform(0.30, 0.60)
                hint_used = np.random.choice([0.0, 1.0], p=[0.4, 0.6])
                attempt_count = np.random.randint(2, 5)
                first_action = np.random.uniform(5.0, 14.0)
                opt_switches = np.random.randint(2, 6)
                clicks = np.random.randint(3, 9)
                hover_sec = np.random.uniform(8.0, 30.0)
                mouse_dist = np.random.uniform(0.5, 1.0)
                mouse_speed = np.random.uniform(60.0, 180.0)
                pauses = np.random.randint(4, 12)
                
            elif state_name == 'RECOVERING':
                correctness = 1.0
                score = 1.0
                error_streak = 0
                time_spent = np.random.uniform(18.0, 45.0)
                recent_acc = np.random.uniform(0.55, 0.75) # improving from low
                hist_acc = np.random.uniform(0.40, 0.65)
                hint_used = np.random.choice([0.0, 1.0], p=[0.6, 0.4])
                attempt_count = np.random.randint(1, 3)
                first_action = np.random.uniform(2.5, 6.0)
                opt_switches = np.random.choice([1, 2], p=[0.7, 0.3])
                clicks = np.random.randint(2, 5)
                hover_sec = np.random.uniform(3.0, 10.0)
                mouse_dist = np.random.uniform(0.3, 0.7)
                mouse_speed = np.random.uniform(140.0, 260.0)
                pauses = np.random.randint(1, 5)
                
            else: # FORGETTING
                correctness = np.random.choice([0.0, 1.0], p=[0.80, 0.20])
                score = correctness
                error_streak = np.random.randint(1, 3)
                time_spent = np.random.uniform(30.0, 75.0)
                recent_acc = np.random.uniform(0.20, 0.50) # recent drop
                hist_acc = np.random.uniform(0.85, 1.0)   # high prior mastery!
                hint_used = np.random.choice([0.0, 1.0], p=[0.5, 0.5])
                attempt_count = np.random.randint(1, 3)
                first_action = np.random.uniform(4.0, 10.0)
                opt_switches = np.random.randint(1, 4)
                clicks = np.random.randint(2, 6)
                hover_sec = np.random.uniform(5.0, 18.0)
                mouse_dist = np.random.uniform(0.3, 0.8)
                mouse_speed = np.random.uniform(90.0, 210.0)
                pauses = np.random.randint(3, 8)

            hesitation = compute_hesitation_index(
                time_spent, first_action, opt_switches, max(0, opt_switches - 1), pauses, hover_sec
            )

            row = {
                'correctness': correctness,
                'score': score,
                'error_streak': error_streak,
                'time_spent_sec': time_spent,
                'recent_accuracy': recent_acc,
                'historical_accuracy': hist_acc,
                'hint_used': hint_used,
                'attempt_count': attempt_count,
                'response_delay_sec': time_spent,
                'time_to_first_action_sec': first_action,
                'option_switch_count': opt_switches,
                'click_count': clicks,
                'hover_duration_sec': hover_sec,
                'mouse_distance_normalized': mouse_dist,
                'average_mouse_speed': mouse_speed,
                'mouse_pause_count': pauses,
                'hesitation_index': hesitation
            }
            rows.append(row)
            labels.append(state_idx)
            
    df = pd.DataFrame(rows)
    y = np.array(labels, dtype=np.int64)
    return df, y
