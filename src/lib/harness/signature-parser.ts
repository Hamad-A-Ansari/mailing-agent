/**
 * Parses function signatures from LeetCode starter code snippets.
 * Extracts: function name, return type, parameters (name + type).
 */

export interface FunctionParam {
  name: string;
  type: string;
}

export interface FunctionSignature {
  className: string;
  functionName: string;
  returnType: string;
  params: FunctionParam[];
}

/**
 * Parse Python3 starter code.
 * Example: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:"
 */
function parsePython(code: string): FunctionSignature | null {
  // Match: def functionName(self, param1: Type1, param2: Type2) -> ReturnType:
  const match = code.match(
    /def\s+(\w+)\s*\(\s*self\s*(?:,\s*(.+?))?\)\s*(?:->\s*(.+?))?\s*:/
  );
  if (!match) return null;

  const functionName = match[1];
  const paramsStr = match[2] || "";
  const returnType = match[3]?.trim() || "None";

  const params: FunctionParam[] = [];
  if (paramsStr.trim()) {
    // Split by comma, but respect brackets
    const paramParts = splitParams(paramsStr);
    for (const part of paramParts) {
      const colonIdx = part.indexOf(":");
      if (colonIdx !== -1) {
        params.push({
          name: part.slice(0, colonIdx).trim(),
          type: part.slice(colonIdx + 1).trim(),
        });
      } else {
        params.push({ name: part.trim(), type: "Any" });
      }
    }
  }

  return { className: "Solution", functionName, returnType, params };
}

/**
 * Parse JavaScript starter code.
 * Example: "var twoSum = function(nums, target) {"
 * Or: "function twoSum(nums, target) {"
 */
function parseJavaScript(code: string): FunctionSignature | null {
  // var/const/let name = function(params)
  let match = code.match(/(?:var|const|let)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/);
  if (!match) {
    // function name(params)
    match = code.match(/function\s+(\w+)\s*\(([^)]*)\)/);
  }
  if (!match) return null;

  const functionName = match[1];
  const paramsStr = match[2] || "";

  const params: FunctionParam[] = paramsStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((name) => ({ name, type: "any" }));

  return { className: "", functionName, returnType: "any", params };
}

/**
 * Parse TypeScript starter code.
 * Example: "function twoSum(nums: number[], target: number): number[] {"
 */
function parseTypeScript(code: string): FunctionSignature | null {
  const match = code.match(
    /function\s+(\w+)\s*\(([^)]*)\)\s*:\s*(.+?)\s*\{/
  );
  if (!match) return parseJavaScript(code); // fallback

  const functionName = match[1];
  const paramsStr = match[2] || "";
  const returnType = match[3]?.trim() || "any";

  const params: FunctionParam[] = [];
  if (paramsStr.trim()) {
    const paramParts = splitParams(paramsStr);
    for (const part of paramParts) {
      const colonIdx = part.indexOf(":");
      if (colonIdx !== -1) {
        params.push({
          name: part.slice(0, colonIdx).trim(),
          type: part.slice(colonIdx + 1).trim(),
        });
      } else {
        params.push({ name: part.trim(), type: "any" });
      }
    }
  }

  return { className: "", functionName, returnType, params };
}

/**
 * Parse C++ starter code.
 * Example: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {"
 */
function parseCpp(code: string): FunctionSignature | null {
  // Normalize: replace literal \n with actual newlines
  const normalized = code.replace(/\\n/g, "\n");
  
  // Try multiple patterns
  // Pattern 1: public:\n    returnType functionName(params) {
  let match = normalized.match(
    /(?:public:[\s\n]*)([\w<>,\s*&:]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\{/
  );
  
  // Pattern 2: Just returnType functionName(params) { anywhere
  if (!match) {
    match = normalized.match(
      /((?:vector|string|int|long|bool|double|void|auto|pair|unordered_map|map|set|ListNode|TreeNode)[\w<>,\s*&:]*)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\{/
    );
  }

  // Pattern 3: very permissive - find any function-looking thing inside Solution class
  if (!match) {
    match = normalized.match(
      /\s+([\w<>,\s*&:]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\{/
    );
  }

  if (!match) return null;

  const returnType = match[1].trim();
  const functionName = match[2];
  const paramsStr = match[3] || "";

  // Skip constructor
  if (functionName === "Solution") return null;

  const params: FunctionParam[] = [];
  if (paramsStr.trim()) {
    const paramParts = splitParams(paramsStr);
    for (const part of paramParts) {
      const trimmed = part.trim();
      // Last word is the name, everything before is type
      // Handle: "vector<int>& nums" → type="vector<int>&", name="nums"
      const lastSpace = trimmed.lastIndexOf(" ");
      if (lastSpace !== -1) {
        let name = trimmed.slice(lastSpace + 1).replace(/^[&*]+/, "");
        if (name.startsWith("&")) name = name.slice(1);
        const type = trimmed.slice(0, lastSpace).trim();
        params.push({ name, type });
      } else {
        params.push({ name: trimmed, type: "auto" });
      }
    }
  }

  return { className: "Solution", functionName, returnType, params };
}

/**
 * Parse Java starter code.
 * Example: "class Solution {\n    public int[] twoSum(int[] nums, int target) {"
 */
function parseJava(code: string): FunctionSignature | null {
  const match = code.match(
    /public\s+([\w<>\[\],\s]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{/
  );
  if (!match) return null;

  const returnType = match[1].trim();
  const functionName = match[2];
  const paramsStr = match[3] || "";

  const params: FunctionParam[] = [];
  if (paramsStr.trim()) {
    const paramParts = splitParams(paramsStr);
    for (const part of paramParts) {
      const trimmed = part.trim();
      const lastSpace = trimmed.lastIndexOf(" ");
      if (lastSpace !== -1) {
        params.push({
          name: trimmed.slice(lastSpace + 1),
          type: trimmed.slice(0, lastSpace).trim(),
        });
      }
    }
  }

  return { className: "Solution", functionName, returnType, params };
}

/**
 * Parse Go starter code.
 * Example: "func twoSum(nums []int, target int) []int {"
 */
function parseGo(code: string): FunctionSignature | null {
  const match = code.match(
    /func\s+(\w+)\s*\(([^)]*)\)\s*([\w\[\]]*)\s*\{/
  );
  if (!match) return null;

  const functionName = match[1];
  const paramsStr = match[2] || "";
  const returnType = match[3]?.trim() || "";

  const params: FunctionParam[] = [];
  if (paramsStr.trim()) {
    const paramParts = splitParams(paramsStr);
    for (const part of paramParts) {
      const trimmed = part.trim();
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx !== -1) {
        params.push({
          name: trimmed.slice(0, spaceIdx),
          type: trimmed.slice(spaceIdx + 1).trim(),
        });
      }
    }
  }

  return { className: "", functionName, returnType, params };
}

/**
 * Split parameters by comma, respecting angle brackets and square brackets.
 */
function splitParams(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of str) {
    if (char === "<" || char === "[" || char === "(") depth++;
    else if (char === ">" || char === "]" || char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);

  return parts;
}

/**
 * Main entry point: parse a code snippet based on language.
 */
export function parseSignature(
  code: string,
  language: string
): FunctionSignature | null {
  switch (language) {
    case "python3":
    case "python":
      return parsePython(code);
    case "javascript":
      return parseJavaScript(code);
    case "typescript":
      return parseTypeScript(code);
    case "cpp":
    case "c++":
      return parseCpp(code);
    case "java":
      return parseJava(code);
    case "golang":
    case "go":
      return parseGo(code);
    default:
      // Try Python first, then JS
      return parsePython(code) || parseJavaScript(code);
  }
}
