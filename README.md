# SentIQ – AI Sentiment Analyzer

  A production-ready AI-based sentiment analyzer for social media posts and product reviews.

  ## Project Structure

  ```
  sentiq/
  ├── frontend/       # React + Vite + Tailwind v4 + shadcn/ui
  ├── backend/        # Express + OpenAI + Drizzle ORM + PostgreSQL
  └── api-spec/       # OpenAPI 3.0 specification
  ```

  ## Getting Started

  ### Backend

  ```bash
  cd backend
  npm install
  # Create a .env file with:
  # DATABASE_URL=postgresql://...
  # OPENAI_API_KEY=your_key
  npm run dev
  ```

  ### Frontend

  ```bash
  cd frontend
  npm install
  npm run dev
  ```

  ## Features

  - Single text sentiment analysis (positive / negative / neutral)
  - Batch processing of up to 500 texts at once
  - CSV export & print-to-PDF reports
  - Analysis history with filtering and pagination
  - Real-time negative sentiment alerts
  - API key management
  