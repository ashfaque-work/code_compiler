const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Queue = require("bull");
const { Worker } = require("worker_threads");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = 7000;

app.use(bodyParser.json({ limit: "50mb" }));

app.use(
  cors({
    // origin: 'http://localhost:5173', // Only allow this origin
    origin: "*", // Allow all origins for testing purposes
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 204,
    credentials: true
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes."
});

app.use("/run", limiter);

const compileQueue = new Queue("compileQueue", {
  redis: {
    // port: 6380, // The new port number
    // host: '127.0.0.1',
    host: "3.7.95.4",
    port: 6379,
    password: "XXXXXX"
  }
});

compileQueue.process((job, done) => {
  console.log("Processing job:", job.id, job.data);
  runWorker(job.data)
    .then((result) => {
      console.log("Job completed:", job.id, result);
      done(null, result);
    })
    .catch((error) => {
      console.error("Job failed:", job.id, error);
      done(new Error(error));
    });
});

function runWorker(workerData) {
  console.log("Starting worker with data:", workerData);
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData,
      resourceLimits: {
        maxOldGenerationSizeMb: 100, // Limit memory to 100 MB
        stackSizeMb: 10, // Limit stack size
      }
    });
    // Assuming worker.on("message", ...) has this processing:
    worker.on("message", (message) => {
      let formattedOutput = message.output;

      // Check if the output has a prefix and remove it
      if (typeof formattedOutput === "string" && formattedOutput.startsWith("Indices: ")) {
        formattedOutput = formattedOutput.replace("Indices: ", "").trim();
      }

      // Send the response back with formatted output
      resolve({
        ...message,
        output: formattedOutput
      });
    });
    worker.on("error", (error) => {
      console.error("Worker error:", error);
      reject(error);
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

app.post("/run", async (req, res) => {
  try {
    console.log("Adding job to the queue...");
    const job = await compileQueue.add(req.body, {
      timeout: 10000, // Job will timeout after 10 seconds if not processed
    });
    console.log("Job added, waiting for completion...");

    const result = await job.finished(); // Await the job completion directly
    console.log("Job completed:", result);

    if (result.state === "ERROR" && result.error) {
      res.json({
        status: "Compilation Error",
        output: result.error // Send only the simplified error message
      });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error("Error adding job or processing:", err);
    res.status(500).json({
      error: "Failed to add job to the queue or process it.",
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});