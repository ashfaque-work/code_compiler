import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { php } from "@codemirror/lang-php";

function App() {
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusBadge, setStatusBadge] = useState(""); // New state for status badge

  const handleRunCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:7000/run",
        { language, code, testcases: [] },
        { timeout: 20000 }
      );

      let outputMessage = "";

      if (response.data.status === "COMPILE_ERROR") {
        setStatusBadge("Compile Error");
        outputMessage = `Compile Error: ${response.data.compileMessage}`;
      } else if (response.data.state === "RUNTIME_ERROR") {
        setStatusBadge("Runtime Error");
        outputMessage = `Finished in ${response.data.runtime}\n${response.data.output}`;
      } else {
        setStatusBadge("Finished");
        outputMessage = `Finished in ${response.data.runtime}\n${response.data.output}`;
      }

      setConsoleOutput((prev) => [
        ...prev,
        { message: outputMessage, status: response.data.status },
      ]);
    } catch (error) {
      setConsoleOutput((prev) => [
        ...prev,
        { message: `Error: ${error.message}`, status: "ERROR" },
      ]);
      setStatusBadge("Error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearConsole = () => {
    setConsoleOutput([]);
    setStatusBadge(""); // Clear the status badge when the console is cleared
  };

  // Define language modes for CodeMirror based on the selected language
  const getLanguageExtension = (lang) => {
    switch (lang) {
      case "cpp":
      case "c":
        return cpp();
      case "python":
        return python();
      case "javascript":
      case "typescript":
        return javascript();
      case "java":
        return java();
      case "php":
        return php();
      default:
        return javascript();
    }
  };

  return (
    <div className="App">
      <div className="header">Online Code Runner</div>

      <div className="container">
        <div className="editor-panel">
          <div className="editor-header">
            <button
              className="run-button"
              onClick={handleRunCode}
              disabled={loading}
            >
              {loading ? "Running..." : "Run Code"}
            </button>
            <select
              className="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="php">PHP</option>
              <option value="go">Go</option>
              <option value="ruby">Ruby</option>
              <option value="rust">Rust</option>
              <option value="csharp">C#</option>
              <option value="dart">Dart</option>
            </select>
          </div>

          <CodeMirror
            value={code}
            height="400px"
            extensions={[getLanguageExtension(language)]}
            onChange={(value, viewUpdate) => {
              setCode(value);
            }}
          />
        </div>

        <div className="output-panel">
          <div className="output-header">
            <div>
              <h3>Output:</h3>
              {statusBadge && (
                <span
                  className={`status-badge ${
                    statusBadge === "Finished"
                      ? "badge-success"
                      : statusBadge === "Compile Error"
                      ? "badge-error"
                      : "badge-runtime-error"
                  }`}
                >
                  {statusBadge}
                </span>
              )}
            </div>

            <button
              className="clear-console-button"
              onClick={handleClearConsole}
            >
              Clear Console
            </button>
          </div>
          <div className="output-console">
            {consoleOutput.length === 0
              ? ""
              : consoleOutput.map((item, index) => (
                  <pre
                    key={index}
                    className={`console-box ${
                      item.status === "COMPILE_ERROR" ||
                      item.status === "RUNTIME_ERROR"
                        ? "error"
                        : "success"
                    }`}
                  >
                    {item.message}
                  </pre>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
