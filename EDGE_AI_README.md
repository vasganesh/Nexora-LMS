# Self-Adaptive Personalized Learning Framework Using Edge Artificial Intelligence

This document provides the complete architectural, mathematical, and operational documentation for the **Self-Adaptive Personalized Learning Framework Using Edge Artificial Intelligence** integrated into the **Nexora LMS** platform.

---

## 1. System Architecture & The Continuous Loop

The platform executes a real-time, closed-loop adaptive cycle continuously throughout the learner's journey:

```
                  ┌─────────────────────────────────────┐
                  │          STUDENT LEARNING           │
                  │   (Quiz, Reading, Exercises)        │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │       1. OBSERVATION PHASE          │
                  │ Continuous Mouse & Temporal Tracking│
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    2. PRIVACY-SAFE EXTRACTION       │
                  │  Aggregate Telemetry Vector Creation │
                  │     (Cognitive Hesitation Index)    │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │     3. EDGE AI STATE INFERENCE      │
                  │ Local Sub-Millisecond Classification│
                  │      Calibrated Probabilities       │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    4. STATE TRANSITION DETECTION    │
                  │  Detects Cognitive Shifts Over Time │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   5. ADAPTIVE INTERVENTION ENGINE   │
                  │   Minimum Intervention Principle    │
                  │            (Levels 0 - 6)           │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │     6. PERSONALIZED SCAFFOLD        │
                  │  Action Delivered Directly to User  │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  (Student Continues Learning & Loop Repeats)
```

---

## 2. The Five Learner States

The system continuously models cognitive proficiency across five distinct learner states:

| State | Definition | Mathematical & Behavioral Thresholds |
|---|---|---|
| **PROGRESSING** | Steady, healthy advancement through curriculum | Balanced accuracy ($65\% - 85\%$), moderate response latency, standard hesitation ($0.25 - 0.55$). |
| **MASTERING** | High proficiency, fluency, and automaticity | Sustained accuracy ($\ge 85\%$), low error streak ($0$), quick decisive response ($< 15\text{s}$), low hesitation ($\le 0.35$). |
| **STRUGGLING** | Encountering conceptual barriers or misconceptions | Consecutive incorrect attempts ($\ge 2$), high hesitation index ($\ge 0.60$), multiple option switches ($\ge 2$). |
| **RECOVERING** | Transitioning out of difficulty towards mastery | Accurate response following a prior `STRUGGLING` or `FORGETTING` state; stabilizing response latency. |
| **FORGETTING** | Memory retention decay after prior mastery | High historical topic mastery ($\ge 80\%$), followed by elapsed decay interval ($> 7\text{ days}$) and accuracy dip ($< 65\%$). |

### State Transition Dynamics
Transitions are recorded with confidence scores and telemetry reasons:
- `PROGRESSING` $\to$ `STRUGGLING` (Barriers identified; triggers Level 1-2 scaffold)
- `STRUGGLING` $\to$ `RECOVERING` (Scaffold successful; positive reinforcement)
- `RECOVERING` $\to$ `MASTERING` (Fluency restored)
- `MASTERING` $\to$ `FORGETTING` (Retention decay detected; prompts Level 5 Spaced Review)
- `FORGETTING` $\to$ `RECOVERING` (Refresher completed successfully)

---

## 3. Concept-Level Personalization

Nexora never labels an entire student as "weak." Intelligence is isolated to fine-grained nodes in the academic hierarchy:

$$\text{Board} \longrightarrow \text{Class} \longrightarrow \text{Subject} \longrightarrow \text{Unit} \longrightarrow \text{Chapter} \longrightarrow \text{Topic/Concept}$$

**Example:**
- Mathematics $\to$ Algebra $\to$ Quadratic Equations $\to$ **Discriminant Calculation**
- The student may be **MASTERING** *Linear Equations* while simultaneously **STRUGGLING** with the *Discriminant*. Interventions target only the exact concept node experiencing friction.

---

## 4. Privacy-Safe Interaction Features & Cognitive Hesitation Index

### Privacy Principle
- Raw cursor coordinates $(x, y)$ are **never permanently stored** or transmitted over the wire.
- Video, webcam, microphone, screen recording, and keylogging are strictly avoided.
- Cursor kinematics are immediately aggregated in browser memory into privacy-safe macroscopic vectors.

### 17-Dimensional Feature Vector
1. `correctness` ($0.0$ or $1.0$)
2. `score` ($0.0$ to $1.0$)
3. `errorStreak` (consecutive incorrect answers)
4. `timeSpentSec` (total question elapsed time)
5. `recentAccuracy` (rolling window of last 5 questions)
6. `historicalAccuracy` (lifetime concept accuracy)
7. `hintUsed` ($0.0$ or $1.0$)
8. `attemptCount` (number of tries)
9. `responseDelaySec` (submission latency)
10. `timeToFirstActionSec` (latency before first mouse move/click)
11. `optionSwitchCount` (answer changing frequency)
12. `clickCount` (click frequency inside assessment area)
13. `hoverDurationSec` (time hovering over choices)
14. `mouseDistanceNormalized` (Euclidean distance scaled)
15. `averageMouseSpeed` (pixels/second)
16. `mousePauseCount` (mouse stillness periods $>800\text{ms}$)
17. `hesitationIndex` (derived cognitive uncertainty score)

### Hesitation Index Formula
The **Hesitation Index** ($H \in [0.0, 1.0]$) quantifies cognitive conflict and hesitation:

$$H = 0.25 \cdot L_{\text{norm}} + 0.25 \cdot S_{\text{norm}} + 0.20 \cdot B_{\text{norm}} + 0.15 \cdot P_{\text{norm}} + 0.15 \cdot \text{HoverRatio}$$

Where:
- $L_{\text{norm}} = \min(1.0, \text{InitialLatency} / 8.0\text{s})$
- $S_{\text{norm}} = \min(1.0, \text{OptionSwitches} / 4)$
- $B_{\text{norm}} = \min(1.0, \text{BacktrackingCount} / 3)$
- $P_{\text{norm}} = \min(1.0, (\text{Pauses} / \text{TotalSec}) \times 4.0)$
- $\text{HoverRatio} = \min(1.0, \text{HoverDuration} / \text{TotalSec})$

---

## 5. Minimum Intervention Principle (Levels 0 - 6)

The engine enforces pedagogical parsimony: *deploy the least intrusive scaffold likely to restore student self-efficacy*.

| Level | Intervention Name | Description | Pedagogical Trigger |
|:---:|---|---|---|
| **0** | **Normal Learning** | Standard progression; no scaffold interruption | `MASTERING` or `PROGRESSING` |
| **1** | **Hint** | Strategic conceptual clue without giving away answer | First struggle or `RECOVERING` |
| **2** | **Explanation** | Concise explanation of underlying concept rules | Continued struggle after hint |
| **3** | **Worked Example** | Full step-by-step demonstrated solution | Error streak $\ge 3$ |
| **4** | **Guided Practice** | Interactive scaffolded problem decomposition | Persistent difficulty across attempts |
| **5** | **Concept Revision** | Spaced review of prerequisite theory and video notes | `FORGETTING` state detected |
| **6** | **Teacher Intervention** | Flagged to teacher dashboard for 1-on-1 human support | Error streak $\ge 4$ or unresolved barriers |

### Confidence-Aware Thresholds
- $\text{Confidence} \ge 0.80$: Immediate automatic execution of scaffold.
- $0.60 \le \text{Confidence} < 0.80$: Conservative adaptation.
- $\text{Confidence} < 0.60$: Avoid aggressive adaptation; queue for teacher observation.

---

## 6. Retention & Forgetting Decay Modeling

Retention is modeled using an exponential decay curve inspired by Ebbinghaus retention dynamics:

$$R(t) = e^{-\frac{t}{S}}$$

Where:
- $t$ is the elapsed days since last mastery session.
- $S = S_0 \cdot (1 + 0.2 \cdot \text{correctCount})$ is the memory stability factor.
- An alert is generated when empirical retention falls below $45\%$ of peak mastery, prompting **Level 5 Concept Revision**.

---

## 7. Edge AI Benchmark & Architecture Comparison

Candidate lightweight models were trained and benchmarked on 3,000 empirical samples under Edge AI constraints:

| Model | Accuracy | Macro-F1 | Latency per Sample | Storage Size | Edge Composite Score |
|---|:---:|:---:|:---:|:---:|:---:|
| **Logistic Regression (Selected)** | **100.0%** | **1.000** | **0.026 ms** | **1.6 KB** | **0.9994** |
| **Random Forest** | 100.0% | 1.000 | 0.763 ms | 187.8 KB | 0.9754 |
| **Small MLP (32 $\to$ 16)** | 98.5% | 0.985 | 0.062 ms | 34.0 KB | 0.9820 |

**Artifact Locations:**
- Model: `edge-ai/models/selected_edge_model.joblib`
- Scaler: `edge-ai/models/scaler.joblib`
- Benchmark Report: `edge-ai/models/model_benchmark.json`

---

## 8. Human-in-the-Loop & Teacher Oversight

Teachers retain ultimate pedagogical authority over AI scaffolds:
- **`[Approve]`**: Authorize AI recommendation to execute immediately.
- **`[Modify]`**: Adjust AI scaffold prompt or difficulty level.
- **`[Override]`**: Replace AI action with custom teacher-crafted instruction.
- **`[Dismiss]`**: Archive alert if teacher deems student is progressing well.

### Teacher-AI Agreement Rate
$$\text{Agreement Rate} = \left( \frac{\text{Approved Count}}{\text{Total Reviewed Interventions}} \right) \times 100\%$$
Displayed live on the Teacher Dashboard to foster trust and system calibration.

---

## 9. API Reference

All endpoints require JWT authorization (`Bearer <token>`):

### Inference & State
- `POST /api/learner-state/infer`: Accepts interaction and academic metrics; runs inference loop; returns prediction, transition, and adaptive scaffold.
- `GET /api/learner-state/student/:studentId`: Returns complete intelligence overview (all concepts, states, mastery scores, transitions).
- `GET /api/learner-state/transitions/:studentId`: Chronological state transition journey timeline.

### Telemetry Interactions
- `POST /api/interactions`: Stores aggregate privacy-safe telemetry vectors.
- `GET /api/interactions/student/:studentId`: Recent interaction logs.

### Adaptive Engine & History
- `POST /api/adaptive/decide`: Computes recommended intervention level for a given state.
- `GET /api/interventions/student/:studentId`: Complete intervention history for a student.

### Teacher Oversight
- `GET /api/interventions/teacher/alerts`: Active alerts requiring teacher review.
- `POST /api/interventions/teacher/:id/action`: Execute `APPROVE`, `MODIFY`, `OVERRIDE`, or `DISMISS`.
- `GET /api/interventions/teacher/agreement-rate`: Returns live Teacher-AI Agreement statistics.

---

## 10. How to Run and Verify the System

### 1. Run Automated Test Suite
```bash
npm test
```
Verifies:
- Hesitation index calculation
- 5-state prediction & probabilities
- State transitions
- Minimum intervention parsimony
- Forgetting decay curve
- Teacher-AI agreement metrics
- Python Edge AI inference script

### 2. Retrain Edge Models
```bash
python3 edge-ai/train.py
```

### 3. Evaluate Edge Performance
```bash
python3 edge-ai/evaluate.py
```

### 4. Build Production Bundle
```bash
npm run build
```

### 5. Launch Full Development Environment
```bash
npm run dev
```
Client runs at: `http://localhost:5173`  
Backend API runs at: `http://localhost:3000/api`

---

## 11. Project Review Demonstration Guide

During your project demonstration, showcase the following real-world workflows:

1. **Student Assessment & Telemetry Capture:**
   - Log in as a student (`rahul.sharma@example.com` / `Student@123`).
   - Open a Quiz (e.g. Mathematics).
   - Move the mouse around, hesitate on options, and observe the live **Hesitation Index** and **Level 1 Hint** scaffold appear immediately upon struggle.
2. **Student Dashboard Intelligence:**
   - Navigate to the Dashboard.
   - Show the **Edge AI Learning Intelligence & Diagnostic States** section.
   - Demonstrate the **Concept-Level Mastery** bars, **Cognitive Hesitation Score**, and the **Learning Journey Timeline** showing state transitions (`PROGRESSING -> STRUGGLING -> RECOVERING -> MASTERING`).
3. **Teacher Human-in-the-Loop Hub:**
   - Log in as a teacher (`teacher@nexora.com` / `Teacher@123`).
   - Switch to the **Edge AI** tab.
   - View active learner alerts, AI confidence, and the **Teacher-AI Agreement Rate**.
   - Click **`[Approve]`**, **`[Modify]`**, or **`[Override]`** to demonstrate live human intervention control.
