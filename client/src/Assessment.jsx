import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import CodeMirror from "@uiw/react-codemirror";
import { getLanguageExtension } from "./helpers";

// Define coding problems and their test cases
const codingProblems = {
  1: {
    title: "Two Sum",
    description: "Given an array of integers and a target value, return indices of two numbers that add up to the target.",
    testCases: [
      { input: "[2,7,11,15], 9", expectedOutput: "[0, 1]" },
      { input: "[3,2,4], 6", expectedOutput: "[1, 2]" },
      { input: "[3,3], 6", expectedOutput: "[0, 1]" },
    ],
    language: "cpp", // Default language for the problem
  },
  2: {
    title: "Palindrome Number",
    description: "Determine whether an integer is a palindrome.",
    testCases: [
      { input: "121", expectedOutput: "true" },
      { input: "-121", expectedOutput: "false" },
      { input: "10", expectedOutput: "false" },
    ],
    language: "cpp",
  },
  3: {
    title: "Reverse Integer",
    description: "Reverse the digits of an integer.",
    testCases: [
      { input: "123", expectedOutput: "321" },
      { input: "-123", expectedOutput: "-321" },
      { input: "120", expectedOutput: "21" },
    ],
    language: "cpp",
  },
  4: {
    title: "Roman to Integer",
    description: "Convert a Roman numeral to an integer.",
    testCases: [
      { input: "III", expectedOutput: "3" },
      { input: "IV", expectedOutput: "4" },
      { input: "IX", expectedOutput: "9" },
    ],
    language: "cpp",
  },
  5: {
    title: "Longest Increasing Subarray",
    description: "Write a program to find the length of the longest subarray such that all of the numbers are arranged in increasing order.",
    testCases: [
      { input: `8 10 20 3 5 6 7 8 11`, expectedOutput: "6" },
      { input: `8 15 8 9 1 8 12 18 20`, expectedOutput: "5" },
    ],
    language: "cpp"
  },
  6: {
    title: "Search Insert Position",
    description:
      "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if inserted in order.",
    testCases: [
      { input: "[1,3,5,6], 5", expectedOutput: "2" },
      { input: "[1,3,5,6], 2", expectedOutput: "1" },
      { input: "[1,3,5,6], 7", expectedOutput: "4" },
    ],
    language: "python"
  }
};

function Assessment() {
  const { id } = useParams();
  const problem = codingProblems[id];
  const [code, setCode] = useState("");
  const [testCases, setTestCases] = useState(problem.testCases || []);
  const [language, setLanguage] = useState(problem.language || "cpp");
  const [loading, setLoading] = useState(false);
  const [statusBadge, setStatusBadge] = useState("");

  useEffect(() => {
    // Update the state when a new problem is selected
    setCode("");
    setTestCases(problem.testCases);
    setLanguage(problem.language);
  }, [id]);

  const handleRunCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8000/run",
        {
          language,
          code,
          testcases: testCases.map((tc) => ({
            input: tc.input,
            output: tc.expectedOutput,
          })),
        },
        { timeout: 20000 }
      );
      let updatedTestCases = [...testCases];
      if (response.data.status === "COMPILE_ERROR") {
        setStatusBadge("Compile Error");
        updatedTestCases = updatedTestCases.map((tc) => ({
          ...tc,
          actualOutput: `Compile Error: ${response.data.compileMessage}`,
          status: "COMPILE_ERROR",
        }));
      } else {
        setStatusBadge("Finished");
        response.data.testResults.forEach((result, index) => {
          const isSuccess = result.actualOutput === result.expectedOutput;
          updatedTestCases[index] = {
            ...updatedTestCases[index],
            actualOutput: result.actualOutput,
            status: isSuccess ? "SUCCESS" : "FAIL",
          };
        });
      }
      setTestCases(updatedTestCases);
    } catch (error) {
      console.error("Error running code:", error);
      setStatusBadge("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Assessment">
      <div className="header">{problem.title}</div>

      <div className="container">
        <div className="editor-panel">
          <div className="editor-header">
            <button className="run-button" onClick={handleRunCode} disabled={loading}>
              {loading ? "Running..." : "Run Code"}
            </button>
            <select className="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>

          <CodeMirror value={code} height="400px" extensions={[getLanguageExtension(language)]} onChange={(value) => setCode(value)} />
        </div>
        <div class="viewer-panel">
          <div className="problem-description">
            <h3>{problem.title}</h3><br></br>
            <p>{problem.description}</p>
            <pre>{/* Display test case examples */}</pre>
          </div>
          <hr></hr>
          <div className="test-cases-panel">
            <h3>Test Cases:</h3>
            <ul>
              {testCases.map((testCase, index) => (
                <li key={index}>
                  <strong>Input:</strong> {testCase.input} | <strong>Expected:</strong> {testCase.expectedOutput} | <strong>Actual:</strong> {testCase.actualOutput || "Not run"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Assessment;
