/**
 * Parses test cases from LeetCode example text.
 *
 * Example text format:
 *   "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: ..."
 *
 * Returns structured { inputs: string[], expected: string }
 */

export interface ParsedTestCase {
  inputs: string[]; // raw input values as strings (e.g. "[2,7,11,15]", "9")
  expected: string; // expected output as string (e.g. "[0,1]")
  stdin: string; // formatted as line-separated values for stdin
}

/**
 * Parse a single example text into structured test case.
 */
export function parseExampleText(exampleText: string): ParsedTestCase | null {
  if (!exampleText) return null;

  const lines = exampleText.split("\n").map((l) => l.trim()).filter(Boolean);

  let inputLine = "";
  let outputLine = "";

  for (const line of lines) {
    if (line.toLowerCase().startsWith("input:")) {
      inputLine = line.slice(6).trim();
    } else if (line.toLowerCase().startsWith("output:")) {
      outputLine = line.slice(7).trim();
    }
  }

  if (!inputLine || !outputLine) {
    // Try alternative format: "Input\nnums = [2,7,11,15]\ntarget = 9\nOutput\n[0,1]"
    let inSection = false;
    let outSection = false;
    const inputParts: string[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower === "input" || lower === "input:") {
        inSection = true;
        outSection = false;
        continue;
      }
      if (lower === "output" || lower === "output:") {
        inSection = false;
        outSection = true;
        continue;
      }
      if (lower.startsWith("explanation")) break;

      if (inSection) inputParts.push(line);
      if (outSection && !outputLine) outputLine = line;
    }

    if (inputParts.length > 0) {
      inputLine = inputParts.join(", ");
    }
  }

  if (!outputLine) return null;

  // Parse inputs: "nums = [2,7,11,15], target = 9" → ["[2,7,11,15]", "9"]
  const inputs = parseInputValues(inputLine);

  // Format stdin: each input on a new line
  const stdin = inputs.join("\n");

  return { inputs, expected: outputLine.trim(), stdin };
}

/**
 * Parse input line into individual values.
 * "nums = [2,7,11,15], target = 9" → ["[2,7,11,15]", "9"]
 * "s = \"hello\"" → ["\"hello\""]
 */
function parseInputValues(inputLine: string): string[] {
  const values: string[] = [];

  // Split by "varname = value" pattern
  // Match: variable = value (where value can be array, string, number, etc.)
  const regex = /\w+\s*=\s*/g;
  const splits: number[] = [];
  let m;
  while ((m = regex.exec(inputLine)) !== null) {
    splits.push(m.index + m[0].length);
  }

  if (splits.length === 0) {
    // No "var = " pattern, just split by comma at top level
    return splitTopLevel(inputLine);
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i];
    const end = i + 1 < splits.length ? findAssignmentBoundary(inputLine, splits[i + 1]) : inputLine.length;
    const value = inputLine.slice(start, end).trim();
    // Remove trailing comma
    values.push(value.replace(/,\s*$/, "").trim());
  }

  return values;
}

/**
 * Find where the next assignment starts (before the "varname = " part).
 */
function findAssignmentBoundary(str: string, nextAssignStart: number): number {
  // Walk backwards from the next assignment to find the comma separator
  let pos = nextAssignStart - 1;
  while (pos > 0 && str[pos] !== ",") pos--;
  return pos > 0 ? pos : nextAssignStart;
}

/**
 * Split a string by commas at the top level (not inside brackets/quotes).
 */
function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let current = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      current += char;
      if (char === stringChar && str[i - 1] !== "\\") inString = false;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      current += char;
    } else if (char === "[" || char === "(" || char === "{") {
      depth++;
      current += char;
    } else if (char === "]" || char === ")" || char === "}") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Parse all examples from a problem into test cases.
 */
export function parseTestCases(
  examples: Array<{ example_num: number; example_text: string }>
): ParsedTestCase[] {
  const testCases: ParsedTestCase[] = [];

  for (const example of examples) {
    const parsed = parseExampleText(example.example_text);
    if (parsed) {
      testCases.push(parsed);
    }
  }

  return testCases;
}
