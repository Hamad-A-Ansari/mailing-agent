/**
 * Harness templates: wrap user code with main() that reads stdin,
 * calls the user's function, and prints the result to stdout.
 *
 * The approach: since LeetCode starter code already defines the function
 * signature, we just need to add a main() that:
 * 1. Reads JSON-formatted input from stdin (one value per line)
 * 2. Calls the user's solution function
 * 3. Prints the result as JSON to stdout
 *
 * For languages where the user writes a class method (Python, C++, Java),
 * we instantiate the class and call the method.
 * For languages where it's a standalone function (JS, Go), we call directly.
 */

import type { FunctionSignature, FunctionParam } from "./signature-parser";

/**
 * Generate a complete runnable program by wrapping user code with a harness.
 */
export function generateHarness(
  userCode: string,
  signature: FunctionSignature,
  language: string,
  stdinInput: string
): { sourceCode: string; stdin: string } {
  switch (language) {
    case "python3":
    case "python":
      return { sourceCode: generatePythonHarness(userCode, signature), stdin: stdinInput };
    case "javascript":
      return { sourceCode: generateJSHarness(userCode, signature), stdin: stdinInput };
    case "typescript":
      return { sourceCode: generateJSHarness(userCode, signature), stdin: stdinInput };
    case "cpp":
      return { sourceCode: generateCppHarness(userCode, signature), stdin: stdinInput };
    case "java":
      return { sourceCode: generateJavaHarness(userCode, signature), stdin: stdinInput };
    case "golang":
    case "go":
      return { sourceCode: generateGoHarness(userCode, signature), stdin: stdinInput };
    default:
      // Fallback: just run the code as-is with stdin
      return { sourceCode: userCode, stdin: stdinInput };
  }
}

// ─── Python ──────────────────────────────────────────────────────────────────

function generatePythonHarness(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const readInputs = paramNames
    .map((name, i) => `    ${name} = json.loads(inputs[${i}])`)
    .join("\n");

  return `import sys, json
from typing import *

${userCode}

if __name__ == "__main__":
    inputs = []
    for line in sys.stdin:
        line = line.strip()
        if line:
            inputs.append(line)
    
${readInputs}
    
    sol = ${sig.className || "Solution"}()
    result = sol.${sig.functionName}(${paramNames.join(", ")})
    print(json.dumps(result))
`;
}

// ─── JavaScript ──────────────────────────────────────────────────────────────

function generateJSHarness(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const readInputs = paramNames
    .map((name, i) => `const ${name} = JSON.parse(inputs[${i}]);`)
    .join("\n");

  return `${userCode}

const inputs = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n').filter(Boolean);
${readInputs}
const result = ${sig.functionName}(${paramNames.join(", ")});
console.log(JSON.stringify(result));
`;
}

// ─── C++ ─────────────────────────────────────────────────────────────────────

function generateCppHarness(userCode: string, sig: FunctionSignature): string {
  const paramDecls = sig.params.map((p) => cppParseDecl(p)).join("\n    ");
  const paramNames = sig.params.map((p) => p.name).join(", ");
  const printResult = cppPrintResult(sig.returnType);

  return `#include <bits/stdc++.h>
using namespace std;

${userCode}

// --- Input parsing helpers ---
${cppParserHelpers()}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    ${paramDecls}
    
    Solution sol;
    auto result = sol.${sig.functionName}(${paramNames});
    
    ${printResult}
    
    return 0;
}
`;
}

function cppParseDecl(param: FunctionParam): string {
  const { name, type } = param;
  // Simplify: read JSON line and parse
  const baseType = type.replace(/&/g, "").trim();

  if (baseType === "int") return `int ${name}; cin >> ${name};`;
  if (baseType === "long long") return `long long ${name}; cin >> ${name};`;
  if (baseType === "double") return `double ${name}; cin >> ${name};`;
  if (baseType === "bool") return `bool ${name}; cin >> ${name};`;
  if (baseType === "string") return `string ${name}; cin >> ${name};`;
  if (baseType.includes("vector<int>") || baseType.includes("vector<int>"))
    return `vector<int> ${name}; { string line; getline(cin, line); stringstream ss(line); int x; char c; ss >> c; while(ss >> x) { ${name}.push_back(x); ss >> c; } }`;
  if (baseType.includes("vector<string>"))
    return `vector<string> ${name}; { string line; getline(cin, line); /* parse JSON array */ }`;
  if (baseType.includes("vector<vector<int>>"))
    return `vector<vector<int>> ${name}; { string line; getline(cin, line); /* parse 2D array */ }`;

  // Default: read a line
  return `string ${name}_raw; getline(cin, ${name}_raw); // TODO: parse ${type}`;
}

function cppPrintResult(returnType: string): string {
  const base = returnType.replace(/&/g, "").trim();
  if (base === "int" || base === "long long" || base === "double" || base === "bool")
    return `cout << result << endl;`;
  if (base === "string") return `cout << "\\\"" << result << "\\\"" << endl;`;
  if (base.includes("vector<int>"))
    return `cout << "["; for(int i=0;i<result.size();i++){ if(i)cout<<","; cout<<result[i]; } cout << "]" << endl;`;
  if (base.includes("vector<string>"))
    return `cout << "["; for(int i=0;i<result.size();i++){ if(i)cout<<","; cout<<"\\\""<<result[i]<<"\\\""; } cout << "]" << endl;`;
  return `cout << result << endl;`;
}

function cppParserHelpers(): string {
  return `// Minimal helpers for common types
// For complex types, the harness may need expansion`;
}

// ─── Java ────────────────────────────────────────────────────────────────────

function generateJavaHarness(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const paramReads = sig.params
    .map((p, i) => javaReadParam(p, i))
    .join("\n        ");
  const printResult = javaPrintResult(sig.returnType);

  return `import java.util.*;
import java.io.*;

${userCode}

class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        List<String> inputs = new ArrayList<>();
        String line;
        while ((line = br.readLine()) != null && !line.isEmpty()) {
            inputs.add(line.trim());
        }
        
        ${paramReads}
        
        Solution sol = new Solution();
        var result = sol.${sig.functionName}(${paramNames.join(", ")});
        
        ${printResult}
    }
}
`;
}

function javaReadParam(param: FunctionParam, index: number): string {
  const { name, type } = param;
  if (type === "int") return `int ${name} = Integer.parseInt(inputs.get(${index}));`;
  if (type === "long") return `long ${name} = Long.parseLong(inputs.get(${index}));`;
  if (type === "String") return `String ${name} = inputs.get(${index}).replaceAll("^\"|\"$", "");`;
  if (type === "int[]") return `int[] ${name} = Arrays.stream(inputs.get(${index}).replaceAll("[\\\\[\\\\]\\\\s]","").split(",")).mapToInt(Integer::parseInt).toArray();`;
  return `String ${name}_raw = inputs.get(${index}); // TODO: parse ${type}`;
}

function javaPrintResult(returnType: string): string {
  if (returnType === "int" || returnType === "long" || returnType === "boolean" || returnType === "double")
    return `System.out.println(result);`;
  if (returnType === "String") return `System.out.println("\\"" + result + "\\"");`;
  if (returnType === "int[]") return `System.out.println(Arrays.toString(result).replace(" ", ""));`;
  if (returnType.startsWith("List<"))
    return `System.out.println(result.toString().replace(" ", ""));`;
  return `System.out.println(result);`;
}

// ─── Go ──────────────────────────────────────────────────────────────────────

function generateGoHarness(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const paramReads = sig.params
    .map((p, i) => goReadParam(p, i))
    .join("\n\t");

  return `package main

import (
\t"bufio"
\t"encoding/json"
\t"fmt"
\t"os"
)

${userCode}

func main() {
\tscanner := bufio.NewScanner(os.Stdin)
\tscanner.Buffer(make([]byte, 1024*1024), 1024*1024)
\tinputs := []string{}
\tfor scanner.Scan() {
\t\tline := scanner.Text()
\t\tif line != "" {
\t\t\tinputs = append(inputs, line)
\t\t}
\t}
\t
\t${paramReads}
\t
\tresult := ${sig.functionName}(${paramNames.join(", ")})
\tout, _ := json.Marshal(result)
\tfmt.Println(string(out))
}
`;
}

function goReadParam(param: FunctionParam, index: number): string {
  const { name, type } = param;
  if (type === "int") return `var ${name} int; json.Unmarshal([]byte(inputs[${index}]), &${name})`;
  if (type === "[]int") return `var ${name} []int; json.Unmarshal([]byte(inputs[${index}]), &${name})`;
  if (type === "string") return `var ${name} string; json.Unmarshal([]byte(inputs[${index}]), &${name})`;
  if (type === "[]string") return `var ${name} []string; json.Unmarshal([]byte(inputs[${index}]), &${name})`;
  if (type === "[][]int") return `var ${name} [][]int; json.Unmarshal([]byte(inputs[${index}]), &${name})`;
  return `var ${name} interface{}; json.Unmarshal([]byte(inputs[${index}]), &${name}) // ${type}`;
}
