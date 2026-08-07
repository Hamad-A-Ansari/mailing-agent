/**
 * Harness Generator: wraps user code with test harness for execution.
 *
 * Flow:
 * 1. Parse function signature from starter code (code_snippets)
 * 2. Parse test cases from problem examples
 * 3. Generate a complete program (user code + main wrapper)
 * 4. Send to Judge0 with test input as stdin
 * 5. Compare stdout with expected output
 */

export { parseSignature } from "./signature-parser";
export type { FunctionSignature, FunctionParam } from "./signature-parser";
export { generateHarness } from "./templates";
export { parseTestCases, parseExampleText } from "./test-case-parser";
export type { ParsedTestCase } from "./test-case-parser";
