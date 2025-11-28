# Wallet Joy 🐷

A modern, intelligent personal finance tracker designed to make managing your money a joy. Built with Next.js 16, Supabase, and AI.

## Features ✨

- **Dashboard**: Get a clear overview of your financial health with real-time balance updates and spending summaries.
- **Smart Transactions**:
  - Automatically categorize transactions.
  - Support for recurring transactions.
  - **AI-Powered Parsing**: Upload bank statements (CSV/TSV/Images) and let OpenAI parse them into structured data. [Learn more](./docs/statement_processing.md).
- **Household Management**:
  - Create joint accounts and invite partners.
  - Manage shared finances with role-based access (Owner/Member).
- **Goals**: Set and track savings goals with visual progress indicators.
- **Reports & Analytics**: Visualize your spending habits with interactive charts and graphs.
- **Import/Export**:
  - Export data to Excel or PDF.
  - Import historical data easily.
- **Modern UI**: Fully responsive design with Dark/Light mode support, built with Tailwind CSS 4.

## Tech Stack 🛠️

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **AI**: [OpenAI API](https://openai.com/) (GPT-4o)
- **Charts**: Recharts
- **Icons**: Custom SVG Icons

## Getting Started 🚀

### Prerequisites

- Node.js (v20+)
- npm or yarn
- A Supabase project
- An OpenAI API key

### Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd finance_tracker
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**

    Copy the example environment file and fill in your credentials:

    ```bash
    cp .env.example .env.local
    ```

    You will need to provide:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SECRET_KEY` (for admin operations like household invites)
    - `OPENAI_API_KEY` (for statement parsing)

4.  **Run the development server**

    ```bash
    npm run dev
    ```

    The application will start on `http://localhost:5678`.

## Project Structure 📂

- `/src/app`: App Router pages and API routes.
- `/src/components`: Reusable UI components.
- `/src/contexts`: React contexts (Auth, Theme, etc.).
- `/src/utils`: Utility functions (Supabase client, formatting, etc.).
- `/supabase`: Database migrations and types.

## License

Private
