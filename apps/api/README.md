# AgriMRV API

This is the backend API for the AgriMRV application. It provides endpoints for authentication, plot management, tree measurements, carbon calculations, and blockchain verification.

## Setup

1. Make sure you have PostgreSQL installed and running
2. Create a database called `agromrv` (if not already created)
3. Update the `.env` file with your database credentials if different
4. Install dependencies:

```bash
npm install
```

## Running the API

To start the development server:

```bash
npm run dev
```

The API will be available at http://localhost:4000 (or whatever port you set in the .env file)

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login and get an authentication token
- `GET /api/auth/profile`: Get the current user's profile (requires authentication)

### Plots

- `GET /api/plots`: Get all plots (optionally filtered by user_id)
- `GET /api/plots/:id`: Get a specific plot by ID
- `POST /api/plots`: Create a new plot
- `PUT /api/plots/:id`: Update a plot
- `DELETE /api/plots/:id`: Delete a plot

### Trees

- `GET /api/trees`: Get all trees (optionally filtered by plot_id)
- `GET /api/trees/:id`: Get a specific tree by ID
- `POST /api/trees`: Create a new tree measurement
- `PUT /api/trees/:id`: Update a tree measurement
- `DELETE /api/trees/:id`: Delete a tree measurement

### Carbon Estimates

- `GET /api/carbon`: Get all carbon estimates
- `GET /api/carbon/:id`: Get a specific carbon estimate by ID
- `POST /api/carbon`: Create a new carbon estimate
- `PUT /api/carbon/:id`: Update a carbon estimate
- `DELETE /api/carbon/:id`: Delete a carbon estimate

### Ledger (Blockchain Verification)

- `GET /api/ledger`: Get all ledger entries (public)
- `GET /api/ledger/:id`: Get a specific ledger entry by ID (public)
- `POST /api/ledger`: Create a new ledger entry (requires authentication and auditor/registry role)

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer your_token_here
```

You get the token by calling the login endpoint.

## Database Schema

The API uses the following tables:

- `users`: User accounts with different roles (farmers, auditors, carbon registries)
- `plots`: Land plots owned by users
- `trees`: Tree measurements for specific plots
- `carbon_estimates`: Carbon sequestration estimates based on tree measurements
- `ledger`: Blockchain verification entries for carbon estimates

## Role-Based Access

- Farmers: Can manage plots and tree measurements
- Auditors: Can verify measurements and create carbon estimates
- Carbon Registries: Can finalize carbon credits and create blockchain verifications
