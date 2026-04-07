'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Question = {
  id: number;
  q: string;
  o: string[];
  a: number;
  explanation: string;
};

type Screen = 'start' | 'quiz' | 'result' | 'review' | 'closed';
type ReviewFilter = 'all' | 'incorrect' | 'unanswered';

type SkillGroup = {
  title: string;
  ids: number[];
  summary: string;
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    q: `Prompt: Classify sentiment:\n'I love it' → Positive\n'I hate it' → Negative\n'Not bad' → Negative\nWhat is the core issue?`,
    o: ['Too few examples', 'Incorrect example bias', 'Missing JSON', 'Too short'],
    a: 1,
    explanation: 'Incorrect labeling biases the model—few-shot examples act as ground truth patterns.',
  },
  {
    id: 2,
    q: 'Adding more few-shot examples sometimes reduces accuracy. Why?',
    o: ['Model ignores them', 'Signal-to-noise dilution', 'Examples must be JSON', 'Tokenization failure'],
    a: 1,
    explanation: 'Too many examples dilute relevant signal and reduce attention to key patterns.',
  },
  {
    id: 3,
    q: 'When inputs are highly variable, why do examples outperform instructions?',
    o: ['They reduce tokens', 'They show patterns implicitly', 'They increase randomness', 'They remove ambiguity'],
    a: 1,
    explanation: 'Examples demonstrate patterns directly, helping the model generalize better.',
  },
  {
    id: 4,
    q: 'Prompt has inconsistent labeling across examples. Model likely to:',
    o: ['Average patterns', 'Pick dominant pattern', 'Ignore examples', 'Crash'],
    a: 1,
    explanation: 'Models tend to follow dominant patterns, leading to inconsistent outputs.',
  },
  {
    id: 5,
    q: `Prompt: Generate 3 solutions and pick the best.\nMissing element?`,
    o: ['More examples', 'Evaluation criteria', 'JSON output', 'Shorter prompt'],
    a: 1,
    explanation: 'Without evaluation criteria, the model cannot reliably choose the best option.',
  },
  {
    id: 6,
    q: `Why does 'think step-by-step' improve outputs?`,
    o: ['More tokens', 'Better reasoning decomposition', 'Less randomness', 'Lower latency'],
    a: 1,
    explanation: 'Step-by-step prompting improves reasoning by structuring intermediate steps.',
  },
  {
    id: 7,
    q: 'Prompting for options is most useful when:',
    o: ['Need single answer', 'Exploring solution space', 'Reducing cost', 'Increasing determinism'],
    a: 1,
    explanation: 'It expands the solution space before narrowing down.',
  },
  {
    id: 8,
    q: 'Prompt asks for 5 ideas but no selection step. Risk?',
    o: ['Too verbose', 'No decision optimization', 'Token overflow', 'Formatting error'],
    a: 1,
    explanation: 'No evaluation step means no optimization or prioritization.',
  },
  {
    id: 9,
    q: 'Combining tasks (summarize + classify) in one prompt fails. Best fix?',
    o: ['Add more text', 'Split into steps', 'Remove examples', 'Increase temperature'],
    a: 1,
    explanation: 'Breaking tasks improves reliability and clarity.',
  },
  {
    id: 10,
    q: 'Prompt: Extract fields but no schema defined. Risk?',
    o: ['Overfitting', 'Inconsistent outputs', 'Latency', 'Token waste'],
    a: 1,
    explanation: 'Lack of schema leads to inconsistent output formatting.',
  },
  {
    id: 11,
    q: 'Classification prompt without clear label definitions leads to:',
    o: ['Higher accuracy', 'Ambiguous outputs', 'Faster results', 'Determinism'],
    a: 1,
    explanation: 'Without definitions, the model interprets labels inconsistently.',
  },
  {
    id: 12,
    q: 'Prompt examples only show positive cases. Outcome?',
    o: ['Balanced classification', 'Bias toward positive', 'Random output', 'No output'],
    a: 1,
    explanation: 'Examples bias the model toward the shown pattern.',
  },
  {
    id: 13,
    q: 'Why enforce strict output format in extraction tasks?',
    o: ['Reduce tokens', 'Ensure consistency', 'Increase creativity', 'Avoid examples'],
    a: 1,
    explanation: 'Strict formats ensure predictable, machine-readable output.',
  },
  {
    id: 14,
    q: 'Prompt: Return JSON but allows explanation. Issue?',
    o: ['Ambiguity', 'Latency', 'Overfitting', 'None'],
    a: 0,
    explanation: 'Mixed instructions create ambiguity in output format.',
  },
  {
    id: 15,
    q: 'Prompt fails on edge cases. Best improvement?',
    o: ['Add random examples', 'Add edge-case examples', 'Increase tokens', 'Remove constraints'],
    a: 1,
    explanation: 'Edge-case examples improve robustness.',
  },
  {
    id: 16,
    q: 'Few-shot vs instructions: choose when patterns are complex:',
    o: ['Instructions', 'Few-shot', 'Neither', 'Random'],
    a: 1,
    explanation: 'Few-shot handles complex patterns better than abstract instructions.',
  },
  {
    id: 17,
    q: 'Pipeline vs single prompt: when better?',
    o: ['Simple tasks', 'Multi-step reasoning', 'Short inputs', 'Low latency'],
    a: 1,
    explanation: 'Pipelines improve complex workflows.',
  },
  {
    id: 18,
    q: 'Hallucination in extraction is best reduced by:',
    o: ['Longer prompts', 'Strict schema', 'More examples', 'Higher temperature'],
    a: 1,
    explanation: 'Schemas constrain output and reduce hallucination.',
  },
  {
    id: 19,
    q: `Prompt: "Be helpful" and classify sentiment. Issue?`,
    o: ['Too long', 'Too vague', 'Too structured', 'Too deterministic'],
    a: 1,
    explanation: 'Vague prompts lead to inconsistent outputs.',
  },
  {
    id: 20,
    q: 'After designing a prompt, what ensures reliability?',
    o: ['Deployment', 'Testing + iteration', 'Longer prompts', 'Removing examples'],
    a: 1,
    explanation: 'Iterative testing improves reliability.',
  },
];

const SKILLS: SkillGroup[] = [
  { title: 'In-context Learning', ids: [1, 2, 3, 4], summary: 'How well you use examples, spot bias, and handle pattern learning.' },
  { title: 'Prompting for Options', ids: [5, 6, 7, 8, 9], summary: 'How well you decompose tasks, explore alternatives, and select the best path.' },
  { title: 'Prompting as ML Tasks', ids: [10, 11, 12, 13, 14], summary: 'How well you design classification and extraction prompts with clear constraints.' },
  { title: 'Robust Prompt Design', ids: [15, 16, 17, 18, 19, 20], summary: 'How well you handle edge cases, pipelines, and reliability.' },
];

const TOTAL_TIME = 300;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function assertValidQuestions(list: Question[]) {
  if (list.length !== 20) {
    throw new Error(`Expected 20 questions, found ${list.length}.`);
  }

  const ids = new Set<number>();
  for (const q of list) {
    if (ids.has(q.id)) throw new Error(`Duplicate question id detected: ${q.id}`);
    ids.add(q.id);
    if (q.o.length !== 4) throw new Error(`Question ${q.id} must have exactly 4 options.`);
    if (q.a < 0 || q.a >= q.o.length) throw new Error(`Question ${q.id} has invalid answer index.`);
  }
}

function runSelfChecks() {
  assertValidQuestions(QUESTIONS);
  if (formatTime(0) !== '0:00') throw new Error('formatTime(0) should be 0:00');
  if (formatTime(5) !== '0:05') throw new Error('formatTime(5) should be 0:05');
  if (formatTime(125) !== '2:05') throw new Error('formatTime(125) should be 2:05');
}

if (process.env.NODE_ENV !== 'production') runSelfChecks();

function getPositiveMessage(percent: number) {
  if (percent >= 90) return 'Outstanding work — you clearly understand the prompting patterns at a very strong level.';
  if (percent >= 75) return 'Great job — you have a solid grasp of the course ideas and can apply them well.';
  if (percent >= 50) return 'Nice effort — you have a good foundation, and a little more practice will take you further.';
  return 'Good start — this was a tough test, and every attempt helps build stronger prompting instincts.';
}

function getSkillStatus(percent: number) {
  if (percent >= 80) return 'Strength';
  if (percent >= 50) return 'Solid';
  return 'Focus';
}

export default function Page() {
  const [name, setName] = useState('');
  const [screen, setScreen] = useState<Screen>('start');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [attemptQuestionIds, setAttemptQuestionIds] = useState<number[]>(QUESTIONS.map((q) => q.id));

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const currentQuestions = useMemo(
    () => QUESTIONS.filter((q) => attemptQuestionIds.includes(q.id)),
    [attemptQuestionIds]
  );

  const score = useMemo(
    () => currentQuestions.reduce((acc, q) => acc + (answers[q.id] === q.a ? 1 : 0), 0),
    [answers, currentQuestions]
  );

  const answeredCount = currentQuestions.filter((q) => answers[q.id] !== undefined).length;
  const progress = currentQuestions.length ? Math.round((answeredCount / currentQuestions.length) * 100) : 0;
  const resultPct = currentQuestions.length ? Math.round((score / currentQuestions.length) * 100) : 0;
  const positiveMessage = getPositiveMessage(resultPct);
  const questionsLeft = currentQuestions.length - answeredCount;
  const urgency = timeLeft < 30 ? '🔥 Almost out of time!' : timeLeft < 60 ? '⚠️ 1 minute left' : '';

  const filteredQuestions = currentQuestions.filter((q) => {
    if (reviewFilter === 'incorrect') return answers[q.id] !== q.a;
    if (reviewFilter === 'unanswered') return answers[q.id] === undefined;
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('quiz');
      if (!saved) return;
      const parsed = JSON.parse(saved) as { name?: string; answers?: Record<number, number> };
      setName(parsed.name || '');
      setAnswers(parsed.answers || {});
    } catch {
      // Ignore corrupted state.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('quiz', JSON.stringify({ name, answers }));
  }, [name, answers]);

  useEffect(() => {
    if (screen !== 'quiz') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setScreen('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [screen]);

  const moduleInsights = SKILLS.map((skill) => {
    const skillQuestions = currentQuestions.filter((q) => skill.ids.includes(q.id));
    const total = skillQuestions.length;
    const correct = skillQuestions.filter((q) => answers[q.id] === q.a).length;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    return { ...skill, total, correct, percent, status: getSkillStatus(percent) };
  });

  const strongest = [...moduleInsights].sort((a, b) => b.percent - a.percent)[0];
  const weakest = [...moduleInsights].sort((a, b) => a.percent - b.percent)[0];

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetToFullQuiz = () => {
    stopTimer();
    setAttemptQuestionIds(QUESTIONS.map((q) => q.id));
    setAnswers({});
    setTimeLeft(TOTAL_TIME);
    setReviewFilter('all');
    setScreen('quiz');
  };

  const startQuiz = () => {
    if (!name.trim()) return;
    resetToFullQuiz();
  };

  const submitQuiz = () => {
    stopTimer();
    setScreen('result');
  };

  const closeTest = () => {
    stopTimer();
    setScreen('closed');
  };

  const restart = () => {
    stopTimer();
    setAttemptQuestionIds(QUESTIONS.map((q) => q.id));
    setAnswers({});
    setTimeLeft(TOTAL_TIME);
    setReviewFilter('all');
    setScreen('start');
  };

  const retryIncorrectOnly = () => {
    const incorrectIds = currentQuestions.filter((q) => answers[q.id] !== q.a).map((q) => q.id);
    if (incorrectIds.length === 0) return;
    stopTimer();
    setAttemptQuestionIds(incorrectIds);
    setAnswers({});
    setTimeLeft(TOTAL_TIME);
    setReviewFilter('all');
    setScreen('quiz');
  };

  const openReview = () => setScreen('review');
  const backToResult = () => setScreen('result');
  const jumpToQuestion = (id: number) => questionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (screen === 'closed') {
    return (
      <div style={styles.appBg}>
        <div style={styles.shell}>
          <div style={styles.heroCard}>
            <div style={styles.badge}>Closed</div>
            <h1 style={styles.heroTitle}>Test Closed</h1>
            <p style={styles.heroText}>Thanks for taking the quiz, {name || 'there'}. You can reopen it anytime and try again.</p>
            <div style={styles.buttonRow}>
              <button style={styles.primaryBtn} type="button" onClick={restart}>Reopen Test</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'start') {
    return (
      <div style={styles.appBg}>
        <div style={styles.shell}>
          <div style={styles.heroCard}>
            <div style={styles.badge}>Hard Mode</div>
            <div style={styles.brandRow}>
              <div style={styles.logoIcon}>⚡</div>
              <h1 style={styles.heroTitle}>AI Prompting Challenge</h1>
            </div>
            <p style={styles.heroText}>20 advanced scenarios · 5 min · real-world prompt decisions from the first three modules.</p>
            <div style={styles.featureGrid}>
              <div style={styles.featureCard}><strong>Skill Insights</strong><span>See where you are strong and where to improve</span></div>
              <div style={styles.featureCard}><strong>Navigator</strong><span>Jump to any question instantly</span></div>
              <div style={styles.featureCard}><strong>Review Loop</strong><span>Retry only incorrect questions</span></div>
            </div>
            <p style={styles.socialProof}>Benchmark: Top performers score above 75%</p>
            <div style={styles.inputRow}>
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <button onClick={startQuiz} style={styles.primaryBtn} type="button" disabled={!name.trim()}>Start Challenge →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'result') {
    return (
      <div style={styles.appBg}>
        <div style={styles.shell}>
          <div style={styles.heroCard}>
            <div style={styles.badge}>Result</div>
            <h1 style={styles.heroTitle}>Your Score: {score}/{currentQuestions.length}</h1>
            <p style={styles.heroText}>{resultPct}% Accuracy</p>
            <div style={styles.resultBanner}>
              <p style={styles.resultHeadline}>{positiveMessage}</p>
              <p style={styles.resultSubtext}>Attempt type: {currentQuestions.length === QUESTIONS.length ? 'Full test' : 'Retry round'}</p>
            </div>
            <div style={styles.insightGrid}>
              {moduleInsights.map((skill) => (
                <div key={skill.title} style={styles.insightCard}>
                  <div style={styles.insightTopRow}>
                    <strong>{skill.title}</strong>
                    <span style={skill.status === 'Strength' ? styles.goodPill : skill.status === 'Solid' ? styles.midPill : styles.warnPill}>{skill.status}</span>
                  </div>
                  <div style={styles.insightScore}>{skill.correct}/{skill.total} ({skill.percent}%)</div>
                  <div style={styles.subtleText}>{skill.summary}</div>
                  <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${skill.percent}%` }} /></div>
                </div>
              ))}
            </div>
            <div style={styles.noteBox}>
              <strong>Strongest area:</strong> {strongest?.title || 'N/A'}<br />
              <strong>Focus next:</strong> {weakest?.title || 'N/A'}
            </div>
            <div style={styles.buttonRowWrap}>
              <button style={styles.primaryBtn} type="button" onClick={openReview}>Review Answers</button>
              <button style={styles.secondaryBtn} type="button" onClick={retryIncorrectOnly} disabled={currentQuestions.every((q) => answers[q.id] === q.a)}>Retry Incorrect Only</button>
              <button style={styles.secondaryBtn} type="button" onClick={restart}>Retake</button>
              <button style={styles.secondaryBtn} type="button" onClick={closeTest}>Close Test</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'review') {
    return (
      <div style={styles.appBg}>
        <div style={styles.shell}>
          <div style={styles.heroCard}>
            <div style={styles.badge}>Review</div>
            <h1 style={styles.heroTitle}>Answer Review</h1>
            <p style={styles.heroText}>Scan mistakes quickly, or retry only the ones you missed.</p>
            <div style={styles.resultBanner}>
              <p style={styles.resultHeadline}>Score: {score}/{currentQuestions.length}</p>
              <p style={styles.resultSubtext}>{resultPct}% Accuracy</p>
            </div>
            <div style={styles.filterRow}>
              <button style={reviewFilter === 'all' ? styles.filterActive : styles.filterBtn} type="button" onClick={() => setReviewFilter('all')}>All</button>
              <button style={reviewFilter === 'incorrect' ? styles.filterActive : styles.filterBtn} type="button" onClick={() => setReviewFilter('incorrect')}>Incorrect</button>
              <button style={reviewFilter === 'unanswered' ? styles.filterActive : styles.filterBtn} type="button" onClick={() => setReviewFilter('unanswered')}>Unanswered</button>
            </div>
            <div style={styles.buttonRowWrap}>
              <button style={styles.primaryBtn} type="button" onClick={backToResult}>Back to Result</button>
              <button style={styles.secondaryBtn} type="button" onClick={retryIncorrectOnly} disabled={currentQuestions.every((q) => answers[q.id] === q.a)}>Retry Incorrect Only</button>
              <button style={styles.secondaryBtn} type="button" onClick={closeTest}>Close Test</button>
            </div>
          </div>

          <div style={styles.cardStack}>
            {filteredQuestions.map((q) => {
              const selectedIndex = answers[q.id];
              const hasAnswer = typeof selectedIndex === 'number';
              const isCorrect = selectedIndex === q.a;
              return (
                <div key={q.id} style={styles.questionCard}>
                  <div style={styles.questionTopRow}>
                    <span style={styles.questionChip}>Q{q.id}</span>
                    <span style={hasAnswer && isCorrect ? styles.passPill : styles.failPill}>{hasAnswer ? (isCorrect ? 'Correct' : 'Incorrect') : 'Unanswered'}</span>
                  </div>
                  <p style={styles.questionText}>{q.q}</p>
                  <div style={styles.reviewGrid}>
                    <div style={{ ...styles.reviewBox, ...(hasAnswer && isCorrect ? styles.reviewCorrect : styles.reviewNeutral) }}>
                      <div style={styles.reviewLabel}>Your answer</div>
                      <div style={styles.reviewValue}>{hasAnswer ? q.o[selectedIndex] : 'Not answered'}</div>
                    </div>
                    <div style={{ ...styles.reviewBox, ...styles.reviewCorrect }}>
                      <div style={styles.reviewLabel}>Correct answer</div>
                      <div style={styles.reviewValue}>{q.o[q.a]}</div>
                    </div>
                  </div>
                  <details style={styles.detailsBox}>
                    <summary style={styles.summaryText}>Why?</summary>
                    <div style={styles.explanationText}>{q.explanation}</div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appBg}>
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.badge}>Quiz in progress</div>
            <h2 style={styles.topTitle}>{name}</h2>
            <p style={styles.subtleText}>{questionsLeft} questions left</p>
          </div>
          <div style={styles.timerCard}>
            <div style={styles.timerLabel}>Time left</div>
            <div style={{ ...styles.timerValue, ...(timeLeft < 60 ? styles.timerUrgent : {}) }}>{formatTime(timeLeft)}</div>
            <div style={styles.timerHint}>{urgency || 'Stay focused'}</div>
          </div>
        </div>

        <div style={styles.heroCard}>
          <div style={styles.progressHeader}>
            <span>Answered: {answeredCount}/{currentQuestions.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>
        </div>

        <div style={styles.heroCard}>
          <div style={styles.navigatorHeader}>
            <strong>Question Navigator</strong>
            <span style={styles.subtleText}>Jump to any question</span>
          </div>
          <div style={styles.navigatorGrid}>
            {currentQuestions.map((q) => {
              const answered = answers[q.id] !== undefined;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => jumpToQuestion(q.id)}
                  style={{ ...styles.navigatorBtn, ...(answered ? styles.navigatorAnswered : {}) }}
                >
                  {q.id}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.cardStack}>
          {currentQuestions.map((q) => (
            <div
              key={q.id}
              ref={(el) => {
                questionRefs.current[q.id] = el;
              }}
              style={styles.questionCard}
            >
              <div style={styles.questionTopRow}>
                <span style={styles.questionChip}>Q{q.id}</span>
                <span style={styles.metaChip}>{answers[q.id] !== undefined ? 'Answered' : 'Pending'}</span>
              </div>
              <p style={styles.questionText}>{q.q}</p>
              <div style={styles.optionsGrid}>
                {q.o.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  return (
                    <label
                      key={i}
                      style={{
                        ...styles.optionCard,
                        ...(selected ? styles.optionSelected : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name={`q${q.id}`}
                        checked={selected}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.buttonRowWrap}>
          <button style={styles.primaryBtn} type="button" onClick={submitQuiz}>Submit Test</button>
          <button style={styles.secondaryBtn} type="button" onClick={closeTest}>Close Test</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appBg: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0f1a 0%, #0b1220 100%)',
    color: '#e5e7eb',
    padding: '24px 16px 40px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  shell: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  topTitle: {
    margin: '8px 0 0',
    fontSize: 28,
    lineHeight: 1.15,
  },
  heroCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardStack: {
    display: 'grid',
    gap: 16,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #10a37f, #34d399)',
    fontSize: 22,
    boxShadow: '0 8px 20px rgba(16,163,127,0.35)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#a7f3d0',
    background: 'rgba(16, 163, 127, 0.14)',
    border: '1px solid rgba(16, 163, 127, 0.35)',
  },
  heroTitle: {
    margin: '0',
    fontSize: 38,
    lineHeight: 1.05,
  },
  heroText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.7,
    color: '#cbd5e1',
  },
  socialProof: {
    margin: '16px 0 0',
    color: '#fbbf24',
    fontWeight: 700,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginTop: 18,
  },
  featureCard: {
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid #223044',
    borderRadius: 16,
    padding: 16,
    display: 'grid',
    gap: 6,
  },
  inputRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 18,
  },
  input: {
    flex: '1 1 240px',
    minWidth: 0,
    borderRadius: 14,
    border: '1px solid #334155',
    background: '#0b1220',
    color: '#e5e7eb',
    padding: '14px 16px',
    outline: 'none',
  },
  primaryBtn: {
    padding: '14px 18px',
    borderRadius: 12,
    border: 'none',
    background: '#10a37f',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: '14px 18px',
    borderRadius: 12,
    border: '1px solid #1e293b',
    background: '#020617',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontWeight: 500,
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 20,
  },
  buttonRowWrap: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  resultBanner: {
    marginTop: 18,
    background: 'rgba(15, 118, 110, 0.16)',
    border: '1px solid rgba(20, 184, 166, 0.35)',
    borderRadius: 18,
    padding: 16,
  },
  resultHeadline: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
  },
  resultSubtext: {
    margin: '6px 0 0',
    color: '#cbd5e1',
  },
  insightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 12,
    marginTop: 18,
  },
  insightCard: {
    background: '#0f172a',
    border: '1px solid #223044',
    borderRadius: 18,
    padding: 16,
  },
  insightTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  insightScore: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 8,
  },
  subtleText: {
    color: '#94a3b8',
    lineHeight: 1.6,
  },
  noteBox: {
    background: '#0b1220',
    border: '1px solid #223044',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    lineHeight: 1.8,
  },
  goodPill: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(16, 163, 127, 0.16)',
    color: '#34d399',
    border: '1px solid rgba(16, 163, 127, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  midPill: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(59, 130, 246, 0.16)',
    color: '#93c5fd',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  warnPill: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(245, 158, 11, 0.16)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    color: '#cbd5e1',
    fontSize: 14,
  },
  progressTrack: {
    marginTop: 12,
    width: '100%',
    height: 10,
    borderRadius: 999,
    background: '#1f2937',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10a37f 0%, #34d399 100%)',
    borderRadius: 999,
    transition: 'width 0.25s ease',
  },
  timerCard: {
    minWidth: 180,
    background: 'rgba(15, 23, 42, 0.92)',
    border: '1px solid #223044',
    borderRadius: 18,
    padding: 16,
    textAlign: 'center',
    display: 'grid',
    alignContent: 'center',
  },
  timerLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  timerValue: {
    fontSize: 28,
    fontWeight: 900,
    marginTop: 6,
    color: '#f8fafc',
  },
  timerUrgent: {
    color: '#fb7185',
  },
  timerHint: {
    marginTop: 4,
    color: '#cbd5e1',
    fontSize: 13,
  },
  navigatorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  navigatorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(42px, 1fr))',
    gap: 8,
  },
  navigatorBtn: {
    height: 42,
    borderRadius: 12,
    border: '1px solid #334155',
    background: '#111827',
    color: '#e5e7eb',
    cursor: 'pointer',
    fontWeight: 800,
  },
  navigatorAnswered: {
    border: '1px solid #10a37f',
    background: 'rgba(16, 163, 127, 0.16)',
    color: '#a7f3d0',
  },
  questionCard: {
    background: 'rgba(17, 24, 39, 0.94)',
    border: '1px solid #223044',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 10px 32px rgba(0,0,0,0.2)',
  },
  questionTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  questionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(16, 163, 127, 0.14)',
    color: '#a7f3d0',
    border: '1px solid rgba(16, 163, 127, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(59, 130, 246, 0.14)',
    color: '#bfdbfe',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  questionText: {
    margin: '0 0 14px',
    fontSize: 17,
    lineHeight: 1.7,
    color: '#f8fafc',
    whiteSpace: 'pre-line',
  },
  optionsGrid: {
    display: 'grid',
    gap: 10,
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: '14px 14px',
    border: '1px solid #334155',
    background: '#0b1220',
    cursor: 'pointer',
    transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease',
  },
  optionSelected: {
    transform: 'translateY(-1px)',
    border: '1px solid #10a37f',
    background: 'rgba(16, 163, 127, 0.12)',
  },
  filterRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 6,
  },
  filterBtn: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #334155',
    background: '#111827',
    color: '#e5e7eb',
    cursor: 'pointer',
    fontWeight: 700,
  },
  filterActive: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #10a37f',
    background: 'rgba(16, 163, 127, 0.16)',
    color: '#a7f3d0',
    cursor: 'pointer',
    fontWeight: 700,
  },
  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
    marginTop: 14,
  },
  reviewBox: {
    padding: 14,
    borderRadius: 16,
    border: '1px solid #334155',
    background: '#0b1220',
  },
  reviewCorrect: {
    border: '1px solid #10a37f',
    background: 'rgba(16, 163, 127, 0.12)',
  },
  reviewNeutral: {
    border: '1px solid #f59e0b',
    background: 'rgba(245, 158, 11, 0.12)',
  },
  reviewLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  reviewValue: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#e5e7eb',
  },
  passPill: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(16, 163, 127, 0.16)',
    color: '#34d399',
    border: '1px solid rgba(16, 163, 127, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  failPill: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(239, 68, 68, 0.16)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    fontSize: 12,
    fontWeight: 700,
  },
  detailsBox: {
    marginTop: 12,
    background: '#0b1220',
    border: '1px solid #223044',
    borderRadius: 16,
    padding: 12,
  },
  summaryText: {
    cursor: 'pointer',
    color: '#e2e8f0',
    fontWeight: 700,
  },
  explanationText: {
    marginTop: 10,
    color: '#cbd5e1',
    lineHeight: 1.7,
  },
};
