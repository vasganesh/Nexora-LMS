"""
Model Training & Edge AI Benchmark Comparison Script

Trains and empirically compares 3 candidate Edge AI models:
1. Multinomial Logistic Regression (L2 regularized)
2. Random Forest Classifier (Optimized depth for edge memory)
3. Small Multi-Layer Perceptron (MLP) (Lightweight neural net: 32 -> 16 units)

Evaluates:
- Accuracy, Precision, Recall, F1-Score (macro)
- Inference Latency per sample (microseconds)
- Model Storage Footprint (KB on disk)
- Memory allocation

Automatically selects and serializes the optimal edge model into models/selected_edge_model.joblib.
"""

import os
import time
import json
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from feature_engineering import generate_benchmark_dataset, FEATURE_NAMES, STATE_LABELS

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)


def measure_inference_latency(model, X_sample: np.ndarray, num_runs: int = 500) -> float:
    """Measures single-instance inference latency in milliseconds."""
    # Warmup
    for _ in range(20):
        _ = model.predict(X_sample[:1])
        
    t0 = time.perf_counter()
    for _ in range(num_runs):
        _ = model.predict(X_sample[:1])
    t1 = time.perf_counter()
    
    avg_latency_ms = ((t1 - t0) / num_runs) * 1000.0
    return round(avg_latency_ms, 4)


def train_and_evaluate_all():
    print("=" * 70)
    print("  EDGE AI LEARNER-STATE MODEL BENCHMARK & SELECTION PIPELINE")
    print("=" * 70)
    
    # 1. Generate / Load Dataset
    print("[1/5] Preparing feature dataset with cognitive hesitation signals...")
    df, y = generate_benchmark_dataset(num_samples=3000, random_seed=42)
    X = df[FEATURE_NAMES].values
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Standard Scaler for distance/latency normalization
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save Scaler
    scaler_path = os.path.join(MODELS_DIR, 'scaler.joblib')
    joblib.dump(scaler, scaler_path)
    
    # 2. Define Candidate Models
    candidates = {
        'Logistic Regression': {
            'model': LogisticRegression(max_iter=1000, C=1.0, random_state=42),
            'needs_scale': True
        },
        'Random Forest': {
            'model': RandomForestClassifier(n_estimators=60, max_depth=8, min_samples_split=4, random_state=42),
            'needs_scale': False
        },
        'Small MLP': {
            'model': MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=500, early_stopping=True, random_state=42),
            'needs_scale': True
        }
    }
    
    results = {}
    
    # 3. Train & Evaluate Candidates
    print("[2/5] Training candidate classifiers...")
    for name, config in candidates.items():
        clf = config['model']
        X_tr = X_train_scaled if config['needs_scale'] else X_train
        X_te = X_test_scaled if config['needs_scale'] else X_test
        
        t_start = time.time()
        clf.fit(X_tr, y_train)
        fit_time = time.time() - t_start
        
        y_pred = clf.predict(X_te)
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average='macro', zero_division=0)
        rec = recall_score(y_test, y_pred, average='macro', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='macro', zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        # Save temporary artifact to measure disk footprint
        temp_path = os.path.join(MODELS_DIR, f"temp_{name.lower().replace(' ', '_')}.joblib")
        joblib.dump(clf, temp_path)
        size_kb = os.path.getsize(temp_path) / 1024.0
        
        latency_ms = measure_inference_latency(clf, X_te)
        
        # Edge AI Composite Score: Balances high accuracy & F1 with low latency and small size
        # Score = F1 - (0.05 * latency_ms) - (0.0001 * size_kb)
        edge_score = f1 - (0.02 * latency_ms) - (0.00005 * size_kb)
        
        results[name] = {
            'accuracy': round(float(acc), 4),
            'precision': round(float(prec), 4),
            'recall': round(float(rec), 4),
            'f1_score': round(float(f1), 4),
            'confusion_matrix': cm,
            'inference_latency_ms': latency_ms,
            'model_size_kb': round(size_kb, 2),
            'training_time_sec': round(fit_time, 3),
            'edge_score': round(edge_score, 4),
            'object': clf,
            'needs_scale': config['needs_scale']
        }
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        print(f"   -> {name:20s} | Acc: {acc:.4f} | F1: {f1:.4f} | Latency: {latency_ms:.3f}ms | Size: {size_kb:.1f}KB")

    # 4. Compare & Select Best Model
    print("[3/5] Comparing Edge AI performance constraints...")
    best_model_name = max(results.keys(), key=lambda k: results[k]['edge_score'])
    best_info = results[best_model_name]
    
    print(f"\n>> Selected Optimal Edge Model: {best_model_name} (Composite Edge Score: {best_info['edge_score']})")
    
    # 5. Persist Selected Artifacts
    print("[4/5] Exporting selected model and metadata...")
    model_export_path = os.path.join(MODELS_DIR, 'selected_edge_model.joblib')
    joblib.dump(best_info['object'], model_export_path)
    
    benchmark_report = {
        'selected_model': best_model_name,
        'state_labels': STATE_LABELS,
        'feature_names': FEATURE_NAMES,
        'models_evaluated': {
            k: {
                metric: v[metric] for metric in [
                    'accuracy', 'precision', 'recall', 'f1_score',
                    'inference_latency_ms', 'model_size_kb', 'training_time_sec', 'edge_score'
                ]
            }
            for k, v in results.items()
        },
        'selected_metrics': {
            'accuracy': best_info['accuracy'],
            'f1_score': best_info['f1_score'],
            'latency_ms': best_info['inference_latency_ms'],
            'model_size_kb': best_info['model_size_kb'],
            'confusion_matrix': best_info['confusion_matrix']
        }
    }
    
    report_path = os.path.join(MODELS_DIR, 'model_benchmark.json')
    with open(report_path, 'w') as f:
        json.dump(benchmark_report, f, indent=2)
        
    print(f"[5/5] Model saved: {model_export_path}")
    print(f"      Benchmark report: {report_path}")
    print("=" * 70)
    return benchmark_report


if __name__ == '__main__':
    train_and_evaluate_all()
