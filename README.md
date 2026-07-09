# Placement AI

Placement AI is a sophisticated web application designed to help students optimize their university admissions journey. It generates university-specific Statements of Purpose (SOPs), Letters of Recommendation (LORs), compiles personalized roadmaps, and provides automated document scoring and admission guidance.

---

## Project Structure

- `pai-backend`: FastAPI backend server. Handles database connections, API routing, intelligence engines, and integrations.
- `pai-frontend-main`: Next.js frontend application. Features a modern, responsive interface built with React, Vanilla CSS, and Framer Motion.

---

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)

---

## Backend Setup (`pai-backend`)

1. **Navigate to the backend directory**:
   ```bash
   cd pai-backend
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   - On Windows:
     ```bash
     .venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source .venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables**:
   Create a `.env` file in the `pai-backend` root folder and populate it with your configuration:
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   SERPAPI_API_KEY=your_serpapi_api_key_here
   DATABASE_URL=postgresql://postgres@127.0.0.1:5432/placement_ai
   JWT_SECRET=your_jwt_secret_key_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

6. **Initialize PostgreSQL Database**:
   The backend includes an automation script that downloads, installs, and runs a portable PostgreSQL server locally for Windows environment:
   ```bash
   python scripts/setup_postgres.py
   ```
   *Note: If PostgreSQL port 5432 is not accessible, the backend will gracefully fallback to a local SQLite database file.*

7. **Start the Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will run at `http://localhost:8000`. You can access the OpenAPI documentation at `http://localhost:8000/docs`.

---

## Frontend Setup (`pai-frontend-main`)

1. **Navigate to the frontend directory**:
   ```bash
   cd ../pai-frontend-main
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The frontend application will be active at `http://localhost:3000`.

---

## Key Features

- **Multi-Step Onboarding & Dossier wizard**: Smooth, intuitive steps to customize profile data.
- **Intelligent University Tracker**: Monitor admission deadlines, match compatibility, and SOP preparation status.
- **Document Optimizers**: Generate and score statements of purpose and resumes tailored for top-tier universities.
