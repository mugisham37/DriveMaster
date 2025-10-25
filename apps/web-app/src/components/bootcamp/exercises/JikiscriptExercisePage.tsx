"use client";

import React, { useState } from "react";
import {
  BootcampExercise,
  BootcampSolution,
  BootcampCode,
  BootcampLinks,
  BootcampProject,
  BootcampCustomFunction,
} from "@/types/bootcamp";
import { useJikiscriptExecution } from "@/hooks/useJikiscriptExecution";

interface JikiscriptExercisePageProps {
  project: BootcampProject;
  exercise: BootcampExercise;
  solution: BootcampSolution;
  test_results?: unknown;
  code: BootcampCode;
  custom_functions: BootcampCustomFunction[];
  links: BootcampLinks;
}

export function JikiscriptExercisePage({
  exercise,
  solution,
  test_results,
  code,
  custom_functions,
  links,
}: Omit<JikiscriptExercisePageProps, "project">) {
  const [jikiCode, setJikiCode] = useState(
    code.stub?.jiki || code.stub?.js || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testOutput, setTestOutput] = useState<Record<string, unknown> | null>(
    null
  );

  const language = exercise.language || "jikiscript";

  // Initialize Jikiscript interpreter
  const { executeJikiscript, runTests, lastError, clearResults } =
    useJikiscriptExecution({
      enableMathFunctions: true,
      customFunctions:
        custom_functions?.map((cf) => ({
          name: cf.name,
          arity: [0, 5], // Default arity, should be parsed from function
          code: cf.code,
        })) || [],
    });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    clearResults();

    try {
      // First, execute the code with the interpreter
      const interpreterResult = await executeJikiscript(jikiCode);

      // If we have tests defined in the exercise config, run them
      if (exercise.config?.tests_type && exercise.config?.exercise_functions) {
        const exerciseTests = exercise.config.exercise_functions.map(
          (func: Record<string, unknown>, index: number) => ({
            name: `Test ${index + 1}: ${String(func.name) || "Function test"}`,
            code: String(func.test_code || `${func.name}()`),
            setup: String(func.setup_code || ""),
            expectedMessage: String(func.expected_message || ""),
          })
        );

        const testResults = await runTests(jikiCode, exerciseTests);
        setTestOutput({
          interpreter_result: interpreterResult,
          test_results: testResults,
          passed_basic_tests: testResults.every((t) => t.passed),
          passed_bonus_tests: testResults
            .filter((t) => t.name.includes("bonus"))
            .every((t) => t.passed),
        });
      } else {
        // No tests defined, just show execution result
        setTestOutput({
          interpreter_result: interpreterResult,
          test_results: [],
          passed_basic_tests: true,
          passed_bonus_tests: false,
        });
      }

      // Also submit to the server for persistence
      const response = await fetch(links.post_submission, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: {
            [`solution.${language === "jikiscript" ? "jiki" : "js"}`]: jikiCode,
          },
          custom_functions: custom_functions.map((cf) => cf.uuid),
          interpreter_result: interpreterResult,
        }),
      });

      if (response.ok) {
        const serverResult = await response.json();
        // Merge server result with interpreter result
        setTestOutput((prev) => ({ ...prev, ...serverResult }));
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setTestOutput({
        error: error instanceof Error ? error.message : "Execution failed",
        passed_basic_tests: false,
        passed_bonus_tests: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    try {
      await fetch(links.complete_solution, {
        method: "POST",
      });
    } catch (error) {
      console.error("Complete failed:", error);
    }
  };

  return (
    <div id="bootcamp-jikiscript-exercise-page" className="exercise-page">
      <div className="exercise-header">
        <h1>{exercise.title}</h1>
        <div className="exercise-meta">
          <span className="language-badge">{String(language)}</span>
          <div className="exercise-status">
            Status: {solution.status}
            {solution.passed_basic_tests && (
              <span className="passed">✓ Basic Tests Passed</span>
            )}
            {solution.passed_bonus_tests && (
              <span className="passed">✓ Bonus Tests Passed</span>
            )}
          </div>
        </div>
      </div>

      <div className="exercise-body">
        <div className="exercise-content">
          <div className="exercise-instructions">
            <div
              dangerouslySetInnerHTML={{ __html: exercise.introduction_html }}
            />
          </div>

          {exercise.tasks && exercise.tasks.length > 0 && (
            <div className="exercise-tasks">
              <h3>Tasks</h3>
              <ol>
                {exercise.tasks.map((task, index) => (
                  <li key={task.id || index}>
                    <h4>{task.title}</h4>
                    <p>{task.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="exercise-editor">
            <h3>
              {language === "jikiscript" ? "Jikiscript" : "JavaScript"} Code
            </h3>
            <textarea
              value={jikiCode}
              onChange={(e) => setJikiCode(e.target.value)}
              className="code-editor jiki-editor"
              rows={20}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          {custom_functions && custom_functions.length > 0 && (
            <div className="custom-functions">
              <h3>Available Custom Functions</h3>
              <div className="functions-list">
                {custom_functions.map((func) => (
                  <div key={func.uuid} className="function-item">
                    <span className="function-name">{func.name}</span>
                    <span className="function-description">
                      {func.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="exercise-actions">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "Running Tests..." : "Run Tests"}
            </button>

            {solution.passed_basic_tests && (
              <button onClick={handleComplete} className="btn-success">
                Complete Exercise
              </button>
            )}

            <a href={links.custom_fns_dashboard} className="btn-secondary">
              Manage Custom Functions
            </a>
          </div>
        </div>

        <div className="exercise-output">
          <h3>Execution Results</h3>
          {lastError && (
            <div
              className="error-output"
              style={{ color: "red", marginBottom: "1rem" }}
            >
              <h4>Error:</h4>
              <pre>{lastError.message}</pre>
            </div>
          )}

          {testOutput ? (
            <div className="test-output">
              {testOutput.error ? (
                <div className="error-message" style={{ color: "red" }}>
                  <strong>Execution Error:</strong> {String(testOutput.error)}
                </div>
              ) : (
                <>
                  {testOutput.test_results &&
                    Array.isArray(testOutput.test_results) &&
                    testOutput.test_results.length > 0 && (
                      <div className="test-results">
                        <h4>Test Results:</h4>
                        {testOutput.test_results.map(
                          (test: Record<string, unknown>, index: number) => (
                            <div
                              key={index}
                              className={`test-result ${
                                (test.passed as boolean) ? "passed" : "failed"
                              }`}
                            >
                              <span className="test-name">
                                {(test.name as string) || ""}
                              </span>
                              <span
                                className={`test-status ${
                                  (test.passed as boolean) ? "pass" : "fail"
                                }`}
                              >
                                {(test.passed as boolean) ? (
                                  <>✓ PASS</>
                                ) : (
                                  <>✗ FAIL</>
                                )}
                              </span>
                              {test.message ? (
                                <div className="test-message">
                                  {String(test.message)}
                                </div>
                              ) : null}
                              {test.error &&
                              typeof test.error === "object" &&
                              test.error !== null &&
                              "message" in test.error ? (
                                <div className="test-error">
                                  {String(
                                    (test.error as { message: unknown }).message
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {testOutput.interpreter_result && (
                    <div className="interpreter-result">
                      <h4>Interpreter Output:</h4>
                      <div className="frames-output">
                        {Array.isArray(
                          (
                            testOutput.interpreter_result as {
                              frames?: unknown[];
                            }
                          )?.frames
                        ) &&
                          (
                            testOutput.interpreter_result as {
                              frames: Record<string, unknown>[];
                            }
                          ).frames.map(
                            (frame: Record<string, unknown>, index: number) => (
                              <div
                                key={index}
                                className={`frame ${frame.status as string}`}
                              >
                                <span className="frame-location">
                                  Line{" "}
                                  {String(
                                    (frame.location as { line?: unknown })?.line
                                  ) || "unknown"}
                                </span>
                                <span className="frame-status">
                                  {String(frame.status)}
                                </span>
                                {frame.result ? (
                                  <div className="frame-result">
                                    Result:{" "}
                                    {String(JSON.stringify(frame.result))}
                                  </div>
                                ) : null}
                                {frame.error &&
                                typeof frame.error === "object" &&
                                frame.error !== null &&
                                "message" in frame.error ? (
                                  <div className="frame-error">
                                    Error:{" "}
                                    {String(
                                      (frame.error as { message: unknown })
                                        .message
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )
                          )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : test_results ? (
            <div className="test-output">
              <pre>{JSON.stringify(test_results, null, 2)}</pre>
            </div>
          ) : (
            <p>Run tests to see results</p>
          )}
        </div>
      </div>

      {exercise.config && (
        <div className="exercise-config">
          <details>
            <summary>Exercise Configuration</summary>
            <div className="config-details">
              {exercise.config.project_type && (
                <p>
                  <strong>Project Type:</strong> {exercise.config.project_type}
                </p>
              )}
              {exercise.config.tests_type && (
                <p>
                  <strong>Tests Type:</strong> {exercise.config.tests_type}
                </p>
              )}
              {exercise.config.stdlib_functions && (
                <div>
                  <strong>Standard Library Functions:</strong>
                  <ul>
                    {exercise.config.stdlib_functions.map((func, index) => (
                      <li key={index}>{JSON.stringify(func)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
