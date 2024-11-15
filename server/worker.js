const { workerData, parentPort } = require("worker_threads");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const compileFunctions = {
  cpp: compileCPPAsync,
  c: compileCAsync,
  python: compilePythonAsync,
  java: compileJavaAsync,
  javascript: compileJavaScriptAsync,
  php: compilePHPAsync,
  go: compileGoAsync,
  typescript: compileTypeScriptAsync,
  dart: compileDartAsync,
  rust: compileRustAsync,
  ruby: compileRubyAsync,
  csharp: compileCSharpAsync
};

(async () => {
  try {
    console.log("Worker started with data:", workerData);
    const { language, code, testcases } = workerData;
    if (!compileFunctions[language]) {
      throw new Error("Unsupported language");
    }

    const compileResult = await compileFunctions[language](code);
    console.log("Compilation result:", compileResult);

    // If there is a compilation error, report it
    if (compileResult.exitCode !== 0) {
      parentPort.postMessage({
        status: "COMPILE_ERROR",
        compileMessage: compileResult.message.join(", "),
        state: "COMPILE_ERROR",
      });
      return;
    }

    // If compilation is successful, proceed to run test cases or execute the program
    if (testcases && testcases.length > 0) {
      const testResults = [];
      for (const testcase of testcases) {
        const startTime = process.hrtime();
        const result = await runCodeAsync(
          compileResult.filePath,
          language,
          testcase.input,
          compileResult
        );
        const endTime = process.hrtime(startTime);
        const elapsedTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to ms

        console.log("Execution result:", result);

        // Determine if the actual output matches the expected output
        const actualOutput = result.out ? result.out.trim() : "";
        const expectedOutput = testcase.output ? testcase.output.trim() : "";
        const isSuccess = actualOutput === expectedOutput;

        // Set status based on whether outputs match and exit code
        const status = result.exitCode === 0 && isSuccess ? "SUCCESS" : "FAIL";

        // Store the result for each test case
        testResults.push({
          input: testcase.input,
          expectedOutput: expectedOutput,
          actualOutput: actualOutput,
          status: status,
          runtime: `${elapsedTime.toFixed(2)} ms`
        });
      }

      // Send a success response for all test cases
      parentPort.postMessage({
        status: "SUCCESS",
        compileMessage: compileResult.message.join(", "),
        testResults: testResults
      });
    } else {
      console.log("Running the code without test cases...");
      const startTime = process.hrtime();
      const result = await runCodeAsync(
        compileResult.filePath,
        language,
        "",
        compileResult
      );

      const endTime = process.hrtime(startTime);
      const elapsedTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to ms

      console.log("Execution result:", result);

      // Determine the status based on exit code
      const status = result.exitCode === 0 ? "SUCCESS" : "RUNTIME_ERROR";

      // Send a success response
      parentPort.postMessage({
        status,
        compileMessage: compileResult.message.join(", "),
        output: result.out || "No output",
        runtime: `${elapsedTime.toFixed(2)} ms`,
        memoryUsage: result.memory || "N/A KB",
        state: status,
        exitCode: result.exitCode
      });
    }
  } catch (error) {
    console.error("Worker encountered an error:", error);
    parentPort.postMessage({
      status: "COMPILE_ERROR",
      compileMessage: error.message,
      state: "ERROR"
    });
  }
})();

function compileAsync(command, args) {
  return new Promise((resolve, reject) => {
    const compile = spawn(command, args);
    let output = "";
    let error = "";

    compile.stdout.on("data", (data) => {
      output += data.toString();
    });

    compile.stderr.on("data", (data) => {
      error += data.toString();
    });

    compile.on("close", (code) => {
      if (code !== 0) {
        reject({ exitCode: code, message: error });
      } else {
        resolve({ exitCode: code, message: ["Compiled Successfully"] });
      }
    });
  });
}

async function compileCPPAsync(code) {
  try {
    const tempFile = path.join(__dirname, "temp.cpp");
    fs.writeFileSync(tempFile, code);
    await compileAsync("g++", [tempFile, "-o", "temp.out"]);
    return {
      exitCode: 0,
      message: ["Compiled Successfully"],
      filePath: "./temp.out"
    };
  } catch (error) {
    console.error("Error in compileCPPAsync:", error);
    return {
      exitCode: error.exitCode,
      message: error.message.split("\n").slice(0, 3) // Limiting the error message to be more readable
    };
  }
}

async function compileCAsync(code) {
  try {
    const tempFile = path.join(__dirname, "temp.c");
    fs.writeFileSync(tempFile, code);
    await compileAsync("gcc", [tempFile, "-o", "temp.out"]);
    return {
      exitCode: 0,
      message: ["Compiled Successfully"],
      filePath: "./temp.out"
    };
  } catch (error) {
    console.error("Error in compileCAsync:", error);
    return {
      exitCode: error.exitCode,
      message: error.message.split("\n").slice(0, 3) // Limiting the error message for readability
    };
  }
}

async function compilePythonAsync(code) {
  const tempFile = path.join(__dirname, "temp.py");
  fs.writeFileSync(tempFile, code);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: tempFile
  };
}

async function compileJavaAsync(code) {
  try {
    const javaDir = path.join(__dirname, "java");
    if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir);

    // Extract the class name using regex
    const classNameMatch = code.match(/class\s+([A-Za-z_]\w*)/);
    if (!classNameMatch) {
      throw new Error("Unable to find a valid class name in the Java code.");
    }

    const className = classNameMatch[1];
    const javaFile = path.join(javaDir, `${className}.java`);
    fs.writeFileSync(javaFile, code);

    await compileAsync("javac", [javaFile]);
    return {
      exitCode: 0,
      message: ["Compiled Successfully"],
      filePath: path.join(javaDir, className), // Return the compiled class file path without extension
      className: className // Include class name for execution later
    };
  } catch (error) {
    console.error("Error in compileJavaAsync:", error);
    return {
      exitCode: error.exitCode || 1,
      message: error.message.split("\n").slice(0, 3) // Limiting the error message for readability
    };
  }
}

async function compileJavaScriptAsync(code) {
  const tempFile = path.join(__dirname, "temp.js");
  fs.writeFileSync(tempFile, code);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: tempFile
  };
}

async function compilePHPAsync(code) {
  const tempFile = path.join(__dirname, "temp.php");

  // Check if the code includes any invalid tokens starting with '<'
  const forbiddenPattern = /^<|<\?/;

  if (forbiddenPattern.test(code)) {
    // Send a compilation error back with the appropriate error message
    throw new Error(
      'PHP Parse error: Unexpected token "<". Please do not include any code starting with "<".',
    );
  }

  // Add `<?php` at the beginning of the code
  const modifiedCode = `<?php\n${code}`;
  fs.writeFileSync(tempFile, modifiedCode);

  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: tempFile
  };
}

async function compileGoAsync(code) {
  const tempFile = path.join(__dirname, "temp.go");
  fs.writeFileSync(tempFile, code);
  await compileAsync("go", ["build", "-o", "temp.out", tempFile]);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: "./temp.out"
  };
}

async function compileRubyAsync(code) {
  const tempFile = path.join(__dirname, "temp.rb");
  fs.writeFileSync(tempFile, code);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: tempFile
  };
}

async function compileCSharpAsync(code) {
  const tempFile = path.join(__dirname, "temp.cs");
  fs.writeFileSync(tempFile, code);
  await compileAsync("mcs", [tempFile]); // Use Mono C# compiler
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: tempFile.replace(".cs", ".exe")
  };
}

async function compileTypeScriptAsync(code) {
  const tempFile = path.join(__dirname, "temp.ts");
  fs.writeFileSync(tempFile, code);
  await compileAsync("tsc", [tempFile]);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: tempFile.replace(".ts", ".js")
  };
}

async function compileDartAsync(code) {
  const tempFile = path.join(__dirname, "temp.dart");
  fs.writeFileSync(tempFile, code);
  await compileAsync("dart", ["compile", "exe", tempFile, "-o", "temp.out"]);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: "./temp.out"
  };
}

async function compileRustAsync(code) {
  const tempFile = path.join(__dirname, "temp.rs");
  fs.writeFileSync(tempFile, code);
  await compileAsync("rustc", [tempFile, "-o", "temp.out"]);
  return {
    exitCode: 0,
    message: ["Compiled Successfully"],
    filePath: "./temp.out"
  };
}

async function runCodeAsync(
  filePath,
  language,
  input = "",
  compileResult = {}
) {
  return new Promise((resolve, reject) => {
    let command, args;

    switch (language) {
      case "cpp":
      case "c":
      case "go":
      case "rust":
      case "dart":
        command = "./temp.out";
        args = [];
        break;
      case "python":
        command = "python3";
        args = [filePath];
        break;
      case "java":
        if (!compileResult.className) {
          reject(new Error("Class name is missing for Java execution."));
          return;
        }
        command = "java";
        args = ["-cp", path.dirname(filePath), compileResult.className];
        break;
      case "javascript":
        command = "node";
        args = [filePath];
        break;
      case "typescript":
        command = "node";
        args = [filePath.replace(".ts", ".js")]; // Execute the transpiled JavaScript file
        break;
      case "php":
        command = "php";
        args = [filePath];
        break;
      case "ruby":
        command = "ruby";
        args = [filePath];
        break;
      case "csharp":
        if (filePath.endsWith(".exe")) {
          // If the file is a compiled executable, use mono
          command = "mono";
          args = [filePath];
        } else {
          // Otherwise, assume it's a .NET Core/.NET 5+ DLL
          command = "dotnet";
          args = [filePath];
        }
        break;
      default:
        reject(new Error("Unsupported language"));
        return;
    }

    const execution = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });

    let actualOutput = "";
    let errorMessages = "";
    let timeout;

    // Timeout after 5 seconds (5000 ms) to avoid infinite loops
    timeout = setTimeout(() => {
      execution.kill("SIGTERM");
      reject(new Error("Execution timed out after 5 seconds"));
    }, 5000);

    // Write input to the process if provided
    if (input) {
      execution.stdin.write(input + "\n");
    }
    execution.stdin.end(); // Close the stdin to indicate there is no more input.

    // Capture standard output
    execution.stdout.on("data", (data) => {
      actualOutput += data.toString();
    });

    // Capture standard error
    execution.stderr.on("data", (data) => {
      errorMessages += data.toString();
    });

    // When the execution is complete
    execution.on("close", (code) => {
      clearTimeout(timeout);
      let state = code === 0 ? "SUCCESS" : "RUNTIME_ERROR";
      if (state === "SUCCESS") {
        resolve({
          exitCode: code,
          out: actualOutput.trim(), // Final output after execution
          memory: (process.memoryUsage().heapUsed / 1024).toFixed(2), // in KB
          state: "SUCCESS"
        });
      } else {
        resolve({
          exitCode: code,
          out: errorMessages.trim() || actualOutput.trim(), // Output error messages if execution failed
          errorMessage: `Execution finished with non-zero exit code: ${code}`,
          state: "RUNTIME_ERROR",
          memory: (process.memoryUsage().heapUsed / 1024).toFixed(2) // in KB
        });
      }
    });

    execution.on("error", (error) => {
      reject(new Error(`Execution failed: ${error.message}`));
    });
  });
}
