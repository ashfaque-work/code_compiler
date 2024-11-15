# Use the official Node.js 20 Bullseye image as the base image
FROM node:20-bullseye

# Install dependencies for Java, Python, g++, C, C#, Go, Ruby, PHP, Dart, and Rust
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-11-jdk \
    python3 \
    python3-pip \
    g++ \
    gcc \
    mono-complete \
    golang \
    ruby \
    php-cli \
    curl \
    gnupg2 \
    ca-certificates \
    wget \
    apt-transport-https && \
    rm -rf /var/lib/apt/lists/*

# Install .NET SDK 6.0
RUN wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y --no-install-recommends dotnet-sdk-6.0 && \
    rm -f packages-microsoft-prod.deb && \
    rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y && \
    export PATH="$HOME/.cargo/bin:$PATH" && \
    ln -s /root/.cargo/bin/rustc /usr/local/bin/rustc && \
    ln -s /root/.cargo/bin/cargo /usr/local/bin/cargo

# Install Dart
RUN curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/dart-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/dart-archive-keyring.gpg] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main" > /etc/apt/sources.list.d/dart_stable.list && \
    apt-get update && apt-get install -y --no-install-recommends dart && \
    rm -rf /var/lib/apt/lists/*

# Install TypeScript globally
RUN npm install -g typescript

# Create app directory
WORKDIR /usr/src/app

# Copy app package files and install app dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the app
CMD ["node", "index.js"]

