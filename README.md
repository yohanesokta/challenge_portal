# Coding Assignment Platform

A lightweight fullstack Next.js application for a coding assignment portal, utilizing MariaDB and Drizzle ORM. The code execution engine runs directly inside the Next.js Docker container using Python. Everything is containerized and runs via Docker Compose.


## Installation

### Linux
To install the application on Linux, run the following command:
```bash
curl -L -o linux.sh https://github.com/yohanesokta/Codelab-JAI/releases/download/1.0/linux.sh && chmod +x linux.sh && ./linux.sh
```

### macOS
To install the application on macOS, run the following command:
```bash
curl -L -o macos.sh https://github.com/yohanesokta/Codelab-JAI/releases/download/1.0/macos.sh && chmod +x macos.sh && ./macos.sh
```


## How to Run (Docker)

To run the application and the database:

1. Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your system.
2. In the root of the project, run:

```bash
docker compose up -d --build
```

This will build and start the following services:
- **db**: MariaDB database (port 3306)
- **app**: Next.js Web Application & API (port 3000)

### Database Migrations
When starting the `app` container, you might need to run the initial database migrations. Since the Dockerfile is currently set up to just start the application, you can run migrations locally using:
```bash
pnpm install
npx drizzle-kit push
```

## Local Development

If you just want to run the database via Docker and the Next.js app locally for active development:

1. Start only the database:
```bash
docker compose up -d db
```
2. Install Node.js dependencies:
```bash
pnpm install
```
3. Run Drizzle migrations to configure the database schema:
```bash
npx drizzle-kit push
```
4. Start the development server:
```bash
pnpm dev
```
5. Open [http://localhost:3000](http://localhost:3000) with your browser.

> **Note:** For local development without Docker, your local machine must have `python3` installed to evaluate coding submissions correctly, since it relies on Node's `child_process.spawn('python3')`.

## System Architecture

The Coding Assignment Platform is built with a modern, modular architecture designed for security, scalability, and ease of use.

### Core Components

1.  **Web Application (Next.js 15)**
    *   **Framework**: Utilizes Next.js 15 with the App Router for a highly responsive and SEO-friendly interface.
    *   **Server Actions**: Leverages React Server Actions for seamless client-server communication without traditional API boilerplate.
    *   **Authentication**: Integrated with NextAuth.js (Auth.js) to provide secure user sessions and role-based access control (Admin/Student).

2.  **Database Layer (MariaDB & Drizzle ORM)**
    *   **Database**: MariaDB 10.11 serves as the primary relational data store, managing users, problems, submissions, and logs.
    *   **ORM**: Drizzle ORM provides a type-safe interface for database operations, ensuring schema consistency and efficient querying.

3.  **Code Execution Engine (Python 3)**
    *   **Runtime**: Submissions are executed in a Python 3 environment within the application's container.
    *   **Sandboxing**: Uses Node.js `child_process.spawn` for isolation, with implemented timeouts (5 seconds) and resource constraints to prevent abuse.
    *   **Evaluators**: Supports multiple evaluation strategies:
        *   **Function Evaluator**: Validates specific function implementations using assertion scripts.
        *   **Class Evaluator**: Tests object-oriented logic by instantiating and interacting with user-defined classes.
        *   **Standard Evaluator (Bebas)**: Performs stdout comparison against expected outputs.

4.  **Security & Integrity (Octa Anticheat)**
    *   **Monitoring**: A Go-based companion application (`app-octaAnticheat`) monitors system-level activities during exams to maintain academic integrity.
    *   **Telemetry**: Real-time logging of "cheat events" (e.g., window switching, forbidden app usage) linked directly to student submissions.

5.  **Microservices**
    *   **Shortlink Service**: A dedicated Node.js microservice that manages URL shortening for easy distribution of challenge links.

### Infrastructure & Deployment

*   **Containerization**: The entire ecosystem is orchestrated via **Docker Compose**, ensuring environment parity across development, staging, and production.
*   **CI/CD**: Automated workflows via GitHub Actions handle building and releasing the Anticheat application and main platform updates.
*   **State Management**: Real-time execution sessions are managed in-memory with automatic cleanup for inactive processes.
