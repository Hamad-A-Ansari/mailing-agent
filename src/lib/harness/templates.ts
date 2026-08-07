/**
 * Harness templates: wrap user code with main() that reads stdin,
 * calls the user's function, and prints the result to stdout.
 *
 * Stdin format: one JSON value per line (one per parameter).
 * Stdout format: JSON-serialized result.
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
      return { sourceCode: genPython(userCode, signature), stdin: stdinInput };
    case "javascript":
    case "typescript":
      return { sourceCode: genJS(userCode, signature), stdin: stdinInput };
    case "cpp":
      return { sourceCode: genCpp(userCode, signature), stdin: stdinInput };
    case "java":
      return { sourceCode: genJava(userCode, signature), stdin: stdinInput };
    case "golang":
    case "go":
      return { sourceCode: genGo(userCode, signature), stdin: stdinInput };
    default:
      return { sourceCode: userCode, stdin: stdinInput };
  }
}

// ─── Python ──────────────────────────────────────────────────────────────────

function genPython(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const readLines = paramNames
    .map((name, i) => `    ${name} = json.loads(inputs[${i}])`)
    .join("\n");

  return [
    `import sys, json`,
    `from typing import *`,
    ``,
    userCode,
    ``,
    `if __name__ == "__main__":`,
    `    inputs = []`,
    `    for line in sys.stdin:`,
    `        line = line.strip()`,
    `        if line:`,
    `            inputs.append(line)`,
    ``,
    readLines,
    ``,
    `    sol = ${sig.className || "Solution"}()`,
    `    result = sol.${sig.functionName}(${paramNames.join(", ")})`,
    `    print(json.dumps(result))`,
  ].join("\n");
}

// ─── JavaScript ──────────────────────────────────────────────────────────────

function genJS(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const readLines = paramNames
    .map((name, i) => `const ${name} = JSON.parse(inputs[${i}]);`)
    .join("\n");

  return [
    userCode,
    ``,
    `const inputs = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n').filter(Boolean);`,
    readLines,
    `const result = ${sig.functionName}(${paramNames.join(", ")});`,
    `console.log(JSON.stringify(result));`,
  ].join("\n");
}

// ─── C++ ─────────────────────────────────────────────────────────────────────

function genCpp(userCode: string, sig: FunctionSignature): string {
  const paramReads = sig.params
    .map((_, i) => `    string line${i}; getline(cin, line${i});`)
    .join("\n");
  const paramDecls = sig.params
    .map((p, i) => cppDeclFromLine(p, i))
    .join("\n");
  const paramNames = sig.params.map((p) => p.name).join(", ");
  const printResult = cppPrint(sig.returnType);

  return [
    `#include <bits/stdc++.h>`,
    `using namespace std;`,
    ``,
    userCode,
    ``,
    `// --- Harness helpers ---`,
    `vector<int> _parseVecInt(const string& s) {`,
    `    vector<int> v; int i=0;`,
    `    while(i<(int)s.size()&&s[i]!='[')i++; i++;`,
    `    string num;`,
    `    while(i<(int)s.size()){`,
    `        if(s[i]==','||s[i]==']'){if(!num.empty())v.push_back(stoi(num));num="";if(s[i]==']')break;}`,
    `        else if(s[i]!=' ')num+=s[i]; i++;`,
    `    } return v;`,
    `}`,
    `vector<string> _parseVecStr(const string& s) {`,
    `    vector<string> v; int i=0;`,
    `    while(i<(int)s.size()&&s[i]!='[')i++; i++;`,
    `    while(i<(int)s.size()){`,
    `        if(s[i]=='"'){i++;string cur;while(i<(int)s.size()&&s[i]!='"'){cur+=s[i];i++;}v.push_back(cur);i++;}`,
    `        else if(s[i]==']')break; else i++;`,
    `    } return v;`,
    `}`,
    `vector<vector<int>> _parseMatrix(const string& s) {`,
    `    vector<vector<int>> m; int i=0;`,
    `    while(i<(int)s.size()&&s[i]!='[')i++; i++;`,
    `    while(i<(int)s.size()){`,
    `        if(s[i]=='['){string inner;int d=0;while(i<(int)s.size()){if(s[i]=='[')d++;if(s[i]==']'){d--;inner+=s[i];i++;if(d==0)break;}else{inner+=s[i];i++;}}m.push_back(_parseVecInt(inner));}`,
    `        else if(s[i]==']')break; else i++;`,
    `    } return m;`,
    `}`,
    ``,
    `int main(){`,
    `    ios::sync_with_stdio(false);`,
    `    cin.tie(nullptr);`,
    paramReads,
    paramDecls,
    ``,
    `    Solution sol;`,
    `    auto result = sol.${sig.functionName}(${paramNames});`,
    ``,
    `    ${printResult}`,
    `    return 0;`,
    `}`,
  ].join("\n");
}

function cppDeclFromLine(param: FunctionParam, idx: number): string {
  const { name, type } = param;
  const base = type.replace(/&/g, "").replace(/const\s*/g, "").trim();
  const ln = `line${idx}`;

  if (base === "int") return `    int ${name} = stoi(${ln});`;
  if (base === "long" || base === "long long") return `    long long ${name} = stoll(${ln});`;
  if (base === "double" || base === "float") return `    double ${name} = stod(${ln});`;
  if (base === "bool") return `    bool ${name} = (${ln}=="true"||${ln}=="1");`;
  if (base === "string") return `    string ${name} = ${ln}; if(${name}.front()=='"')${name}=${name}.substr(1,${name}.size()-2);`;
  if (base === "char") return `    char ${name} = ${ln}[0]=='\\''?${ln}[1]:${ln}[0];`;
  if (base.includes("vector<vector<int>")) return `    vector<vector<int>> ${name} = _parseMatrix(${ln});`;
  if (base.includes("vector<int>")) return `    vector<int> ${name} = _parseVecInt(${ln});`;
  if (base.includes("vector<string>")) return `    vector<string> ${name} = _parseVecStr(${ln});`;
  // Default
  return `    int ${name} = stoi(${ln}); // fallback for ${type}`;
}

function cppPrint(returnType: string): string {
  const base = returnType.replace(/&/g, "").trim();
  if (base === "int" || base === "long" || base === "long long" || base === "double" || base === "bool")
    return `cout << result << endl;`;
  if (base === "string") return `cout << "\\"" << result << "\\"" << endl;`;
  if (base.includes("vector<vector<int>")) {
    return [
      `cout << "[";`,
      `    for(int i=0;i<(int)result.size();i++){`,
      `        if(i)cout<<","; cout<<"[";`,
      `        for(int j=0;j<(int)result[i].size();j++){if(j)cout<<",";cout<<result[i][j];}`,
      `        cout<<"]";`,
      `    } cout << "]" << endl;`,
    ].join("\n    ");
  }
  if (base.includes("vector<int>"))
    return `cout<<"[";for(int i=0;i<(int)result.size();i++){if(i)cout<<",";cout<<result[i];}cout<<"]"<<endl;`;
  if (base.includes("vector<string>"))
    return `cout<<"[";for(int i=0;i<(int)result.size();i++){if(i)cout<<",";cout<<"\\""<<result[i]<<"\\"";} cout<<"]"<<endl;`;
  return `cout << result << endl;`;
}

// ─── Java ────────────────────────────────────────────────────────────────────

function genJava(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const paramReads = sig.params
    .map((p, i) => javaRead(p, i))
    .join("\n        ");
  const printResult = javaPrint(sig.returnType);

  return [
    `import java.util.*;`,
    `import java.io.*;`,
    ``,
    userCode,
    ``,
    `class Main {`,
    `    public static void main(String[] args) throws Exception {`,
    `        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));`,
    `        List<String> inputs = new ArrayList<>();`,
    `        String line;`,
    `        while ((line = br.readLine()) != null && !line.isEmpty()) {`,
    `            inputs.add(line.trim());`,
    `        }`,
    `        ${paramReads}`,
    `        Solution sol = new Solution();`,
    `        var result = sol.${sig.functionName}(${paramNames.join(", ")});`,
    `        ${printResult}`,
    `    }`,
    `}`,
  ].join("\n");
}

function javaRead(param: FunctionParam, idx: number): string {
  const { name, type } = param;
  if (type === "int") return `int ${name} = Integer.parseInt(inputs.get(${idx}));`;
  if (type === "long") return `long ${name} = Long.parseLong(inputs.get(${idx}));`;
  if (type === "String") return `String ${name} = inputs.get(${idx}).replaceAll("^\\"|\\"$", "");`;
  if (type === "int[]" || type === "int []")
    return `int[] ${name} = Arrays.stream(inputs.get(${idx}).replaceAll("[\\\\[\\\\]\\\\s]","").split(",")).mapToInt(Integer::parseInt).toArray();`;
  return `String ${name}_raw = inputs.get(${idx}); // TODO: parse ${type}`;
}

function javaPrint(returnType: string): string {
  if (returnType === "int" || returnType === "long" || returnType === "boolean" || returnType === "double")
    return `System.out.println(result);`;
  if (returnType === "String") return `System.out.println("\\"" + result + "\\"");`;
  if (returnType === "int[]") return `System.out.println(Arrays.toString(result).replace(" ", ""));`;
  if (returnType.startsWith("List<")) return `System.out.println(result.toString().replace(" ", ""));`;
  return `System.out.println(result);`;
}

// ─── Go ──────────────────────────────────────────────────────────────────────

function genGo(userCode: string, sig: FunctionSignature): string {
  const paramNames = sig.params.map((p) => p.name);
  const paramReads = sig.params.map((p, i) => goRead(p, i)).join("\n\t");

  return [
    `package main`,
    ``,
    `import (`,
    `\t"bufio"`,
    `\t"encoding/json"`,
    `\t"fmt"`,
    `\t"os"`,
    `)`,
    ``,
    userCode,
    ``,
    `func main() {`,
    `\tscanner := bufio.NewScanner(os.Stdin)`,
    `\tscanner.Buffer(make([]byte, 1024*1024), 1024*1024)`,
    `\tinputs := []string{}`,
    `\tfor scanner.Scan() {`,
    `\t\tline := scanner.Text()`,
    `\t\tif line != "" { inputs = append(inputs, line) }`,
    `\t}`,
    `\t${paramReads}`,
    `\tresult := ${sig.functionName}(${paramNames.join(", ")})`,
    `\tout, _ := json.Marshal(result)`,
    `\tfmt.Println(string(out))`,
    `}`,
  ].join("\n");
}

function goRead(param: FunctionParam, idx: number): string {
  const { name, type } = param;
  if (type === "int") return `var ${name} int; json.Unmarshal([]byte(inputs[${idx}]), &${name})`;
  if (type === "[]int") return `var ${name} []int; json.Unmarshal([]byte(inputs[${idx}]), &${name})`;
  if (type === "string") return `var ${name} string; json.Unmarshal([]byte(inputs[${idx}]), &${name})`;
  if (type === "[]string") return `var ${name} []string; json.Unmarshal([]byte(inputs[${idx}]), &${name})`;
  if (type === "[][]int") return `var ${name} [][]int; json.Unmarshal([]byte(inputs[${idx}]), &${name})`;
  return `var ${name} interface{}; json.Unmarshal([]byte(inputs[${idx}]), &${name})`;
}
