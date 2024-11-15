Code Compiler Web Application
This is a web-based code compiler application developed using Node.js, React, and Docker. It allows users to write, compile, and execute code in various programming languages directly from a web browser. The application provides an interactive interface for coding and displays the output in real time.

Features
Compile and execute code in multiple programming languages (e.g., Python, C++, Java, etc.).
Real-time output display.
Simple and interactive UI for coding, editing, and viewing results.
Isolated environment for executing code using Docker containers.

Tech Stack
Frontend: React
Backend: Node.js, Express
Containerization: Docker

Prerequisites
Node.js: Ensure that Node.js is installed (version >= 14.x).
Docker: Docker must be installed and running on your machine.

Getting Started
1. Clone the repository
git clone https://github.com/ashfaque-work/code_compiler.git
cd code_compiler

3. Install Dependencies
For both the frontend and backend, install dependencies using npm.

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

3. Environment Setup
Create a .env file in the server directory with the following environment variables:
PORT=5000
DOCKER_IMAGE=<name-of-your-docker-image>

4. Run the Application
You can run the application in a local environment or using Docker.

Option A: Run Locally
# Start the backend
cd server
npm start

# Start the frontend
cd ../client
npm start

Option B: Run with Docker
Build and run the Docker container:
# Build Docker images
docker-compose build

# Start the application
docker-compose up
The application will be available at http://localhost:3000.

Usage
Open the web application in your browser.
Choose the desired programming language from the dropdown menu.
Write your code in the editor.
Click on "Run" to compile and execute the code.
View the output displayed in the output panel.

Docker Notes
Each code execution is performed in a Docker container, ensuring code runs in an isolated environment. This helps maintain security and limits resource usage.

Contributing
Fork the repository.
Create a new feature branch (git checkout -b feature/YourFeature).
Commit your changes (git commit -m 'Add YourFeature').
Push to the branch (git push origin feature/YourFeature).
Create a Pull Request.

License
This project is licensed under the MIT License.
