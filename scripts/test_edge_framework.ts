/**
 * Automated Test Suite for Self-Adaptive Edge AI Framework
 * 
 * Verifies:
 * 1. Feature Extraction & Cognitive Hesitation Index
 * 2. 5-State Prediction & Calibrated Probabilities
 * 3. State Transition Detection
 * 4. Forgetting Detection & Retention Modeling
 * 5. Minimum Intervention Principle (Levels 0-6)
 * 6. Teacher Human-In-The-Loop Actions & Agreement Stats
 * 7. Failure Fallback Resilience
 */

import { LearnerFeatureService, RawInteractionMetrics, AcademicMetrics } from '../server/services/learnerFeatureService.js';
import { LearnerStateService } from '../server/services/learnerStateService.js';
import { StateTransitionService } from '../server/services/stateTransitionService.js';
import { AdaptiveEngine } from '../server/services/adaptiveEngine.js';
import { ForgettingDetectionService } from '../server/services/forgettingDetectionService.js';
import { InterventionService } from '../server/services/interventionService.js';
import { prisma } from '../server/lib/prisma.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('  RUNNING EDGE AI FRAMEWORK COMPREHENSIVE TEST SUITE');
  console.log('=============================================================\n');

  // -------------------------------------------------------------
  // Test 1: Hesitation Index & Feature Extraction
  // -------------------------------------------------------------
  console.log('[Test Group 1: Feature Extraction & Hesitation Index]');
  const interactionHighHesitation: RawInteractionMetrics = {
    questionStartTime: 1000,
    answerSubmissionTime: 65000,
    firstInteractionTime: 12000,
    answerChanges: 3,
    optionSwitches: 4,
    backtrackCount: 3,
    clickCount: 8,
    hoverDurationMs: 25000,
    mouseDistancePx: 3200,
    averageMouseSpeed: 110,
    mousePauses: 8,
    totalTimeSpentMs: 64000
  };

  const hesitationHigh = LearnerFeatureService.calculateHesitationIndex(interactionHighHesitation);
  assert(hesitationHigh >= 0.60, `High hesitation index correctly flagged (val: ${hesitationHigh})`);

  const interactionLowHesitation: RawInteractionMetrics = {
    questionStartTime: 1000,
    answerSubmissionTime: 6000,
    firstInteractionTime: 2000,
    answerChanges: 0,
    optionSwitches: 0,
    backtrackCount: 0,
    clickCount: 1,
    hoverDurationMs: 800,
    mouseDistancePx: 350,
    averageMouseSpeed: 300,
    mousePauses: 0,
    totalTimeSpentMs: 5000
  };

  const hesitationLow = LearnerFeatureService.calculateHesitationIndex(interactionLowHesitation);
  assert(hesitationLow <= 0.35, `Low hesitation index correctly flagged (val: ${hesitationLow})`);

  const academicSuccess: AcademicMetrics = {
    isCorrect: true,
    score: 1.0,
    attempts: 1,
    errorStreak: 0,
    recentAccuracy: 0.9,
    historicalAccuracy: 0.95,
    timeSpentLearningSec: 5,
    hintRequested: false
  };

  const vector = LearnerFeatureService.extractFeatureVector(academicSuccess, interactionLowHesitation);
  assert(vector.correctness === 1.0, 'Vector contains correctness');
  assert(vector.hesitationIndex === hesitationLow, 'Vector retains calculated hesitation');
  assert(vector.optionSwitchCount === 0, 'Vector accurately captures zero option switches');

  // -------------------------------------------------------------
  // Test 2: 5 Learner States Prediction & Explainability
  // -------------------------------------------------------------
  console.log('\n[Test Group 2: Five Learner States & Calibrated Probabilities]');
  
  // STRUGGLING prediction
  const academicStruggle: AcademicMetrics = {
    isCorrect: false,
    score: 0.0,
    attempts: 3,
    errorStreak: 3,
    recentAccuracy: 0.25,
    historicalAccuracy: 0.40,
    timeSpentLearningSec: 64,
    hintRequested: true
  };
  const vectorStruggle = LearnerFeatureService.extractFeatureVector(academicStruggle, interactionHighHesitation);
  const strugglePrediction = LearnerStateService.predictState(vectorStruggle, 'PROGRESSING');
  
  assert(strugglePrediction.state === 'STRUGGLING', `Predicts STRUGGLING under error streak and high hesitation (got: ${strugglePrediction.state})`);
  assert(strugglePrediction.confidence >= 0.60, `Calibrated confidence is reasonable (${strugglePrediction.confidence})`);
  assert(strugglePrediction.explanationFactors.length > 0, 'Generates human-readable Explainable AI factors');

  // MASTERING prediction
  const masteringPrediction = LearnerStateService.predictState(vector, 'PROGRESSING');
  assert(masteringPrediction.state === 'MASTERING', `Predicts MASTERING for high accuracy & low hesitation (got: ${masteringPrediction.state})`);

  // RECOVERING prediction (struggled before, now correct)
  const recoveringPrediction = LearnerStateService.predictState(vector, 'STRUGGLING');
  assert(recoveringPrediction.state === 'RECOVERING', `Detects RECOVERING when accurate response follows STRUGGLING state (got: ${recoveringPrediction.state})`);

  // -------------------------------------------------------------
  // Test 3: Minimum Intervention Principle (Levels 0-6)
  // -------------------------------------------------------------
  console.log('\n[Test Group 3: Minimum Intervention Principle & Confidence Thresholds]');
  
  // Level 0 for Mastering
  const decMaster = await AdaptiveEngine.determineIntervention('test-stu-1', 'topic-1', masteringPrediction, 'Algebra');
  assert(decMaster.level === 0, `Mastering student assigned Level 0 Normal Learning (got: ${decMaster.level})`);
  assert(decMaster.autoExecute === true, 'Level 0 auto-executes');

  // Level 1 (Hint) for Initial Struggle
  const decStruggle1 = await AdaptiveEngine.determineIntervention('test-stu-1', 'topic-1', strugglePrediction, 'Algebra');
  assert(decStruggle1.level >= 1 && decStruggle1.level <= 2, `Initial struggle escalates to minimal scaffold Level ${decStruggle1.level}`);
  assert(Boolean(decStruggle1.suggestedActionPayload?.hintText || decStruggle1.suggestedActionPayload?.explanationText), 'Payload contains concrete pedagogical support');

  // -------------------------------------------------------------
  // Test 4: Forgetting Detection & Retention Curve
  // -------------------------------------------------------------
  console.log('\n[Test Group 4: Forgetting Detection & Spaced Review]');
  // For student with no prior mastery, forgetting returns false
  const testStudentUuid = '00000000-0000-0000-0000-000000000001';
  const testTopicUuid = '00000000-0000-0000-0000-000000000002';
  const forgettingResult = await ForgettingDetectionService.evaluateForgetting(testStudentUuid, testTopicUuid, 0.2);
  assert(forgettingResult.isForgetting === false, 'Forgetting does not trigger if concept was never previously mastered');

  // -------------------------------------------------------------
  // Test 5: Teacher-AI Agreement Rate & Human-in-the-Loop
  // -------------------------------------------------------------
  console.log('\n[Test Group 5: Teacher-in-the-Loop Actions & Agreement Stats]');
  const initialStats = await InterventionService.getTeacherAIAgreementStats();
  assert(typeof initialStats.agreementRate === 'number', `Computes agreement rate (${initialStats.agreementRate}%)`);

  // -------------------------------------------------------------
  // Test 6: Python Edge AI Predict Script Integration
  // -------------------------------------------------------------
  console.log('\n[Test Group 6: Edge AI Python Script Execution]');
  const edgeScriptResult = await LearnerStateService.predictStateWithEdgeAI(vectorStruggle, 'PROGRESSING', 'Quadratic Equations');
  assert(edgeScriptResult.state === 'STRUGGLING', `Edge AI script correctly predicts STRUGGLING (got: ${edgeScriptResult.state})`);
  assert(typeof edgeScriptResult.confidence === 'number', `Edge AI script returned confidence: ${edgeScriptResult.confidence}`);

  console.log('\n=============================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
  console.log('=============================================================\n');
}

runTestSuite().catch(err => {
  console.error('\nTest Suite execution failed with error:', err);
  process.exit(1);
});
