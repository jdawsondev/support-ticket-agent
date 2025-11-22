# Support Ticket Agent - Orders API

This project contains a simple Express.js API for managing orders, backed by a SQLite database. It includes structured logging, request validation, and a "Chaos Monkey" middleware to simulate production failures.

## Project Structure

- `api/`: Contains the Express.js server code and SQLite database.
- `load-tests/`: Contains Artillery load test definitions.

## Prerequisites

- Node.js (v14 or higher)
- npm

## Getting Started

### 1. Setup the API

Navigate to the `api` directory and install dependencies:

```bash
cd api
npm install
```

### 2. Run the API

Start the server:

```bash
npm start
```

The server will start on `http://localhost:3000`.
A SQLite database file `orders.db` will be created automatically in the `api` directory.
Logs are output to the console and saved to `api/app.log`.

### API Endpoints

- `POST /orders`: Create a new order.
- `GET /orders`: List all orders (supports `?status=` and `?customerName=` filters).
- `GET /orders/:id`: Get an order by ID.
- `PATCH /orders/:id`: Partially update an order.
- `DELETE /orders/:id`: Delete an order.

**Note:** The API has a built-in "Chaos Monkey" that randomly fails 10% of requests with 500/503/504 errors to simulate real-world instability.

## Running Load Tests

Load tests are defined using [Artillery](https://www.artillery.io/).

### 1. Install Artillery

If you haven't installed Artillery globally yet:

```bash
npm install -g artillery
```

### 2. Run the Tests

Ensure the API is running in a separate terminal window. Then, from the root of the project (or the `load-tests` directory), run:

```bash
artillery run load-tests/orders.yml
```

This scenario simulates:

- Creating orders
- Retrieving orders
- Updating orders (valid and invalid)
- Deleting orders
- Searching for orders
- Sending invalid requests to test validation

You will see a report in the terminal showing request latency, throughput, and the number of successful vs. failed requests (expect some failures due to the Chaos Monkey!).
