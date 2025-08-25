# AgriMRV Web Frontend

This is the web frontend for the AgriMRV application. It provides a user interface for interacting with the API to manage plots, tree measurements, carbon calculations, and blockchain verification.

## Setup

1. Make sure the API is set up and running
2. Install dependencies:

```bash
npm install
```

## Running the Web App

To start the development server:

```bash
npm run dev
```

The web app will be available at http://localhost:3000

## Features

- User authentication (login/register)
- Dashboard with overview of plots and trees
- Plot management (create, view, update, delete)
- Tree measurement recording and viewing
- Carbon sequestration estimates
- Blockchain verification of carbon credits

## Environment Variables

The following environment variables are used:

- `API_URL`: The URL of the API server (default: http://localhost:4000)

These can be set in a `.env.local` file in the project root.

## Architecture

The web app uses:

- Next.js for server-side rendering and routing
- React for UI components
- Axios for API communication
- Tailwind CSS for styling
- React Hook Form for form handling
