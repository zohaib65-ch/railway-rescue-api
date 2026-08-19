# 🚂 Railway Rescue API

A RESTful API backend for the **Railway Rescue** platform. Allows operators to publish and manage train rescue requests with strict server-side validation — including uniqueness enforcement for active train numbers.

---

## Features

- ✅ **Publish train rescue requests** with movement type (standard / LZ / other)
- 🔒 **Server-side duplicate check** — the same train number cannot be active twice simultaneously
- 🗄️ **DB-level safety net** — partial unique index ensures concurrent requests can't slip through
- 🔢 **Train number validation** — numeric only, max 6 digits (1–999,999)
- 📋 **Status lifecycle** — `active` → `completed` | `cancelled`
- 🌐 **CORS** configured, **morgan** logging, **express-validator** input sanitisation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Validation | express-validator |
| Logging | morgan |

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

### 3. Start in development mode
```bash
npm run dev
```

### 4. Start in production
```bash
npm start
```

The server starts on `http://localhost:3000` by default.

---

## API Reference

### Health Check
```
GET /health
```

### Train Requests

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/trains` | Publish a new rescue request |
| `GET` | `/api/trains` | List all requests (filter: `?status=active&movementType=LZ`) |
| `GET` | `/api/trains/active` | List active requests only |
| `GET` | `/api/trains/:id` | Get a specific request |
| `PATCH` | `/api/trains/:id/status` | Mark as `completed` or `cancelled` |
| `DELETE` | `/api/trains/:id` | Delete a request |

---

### Example: Publish a Train Request

```bash
POST /api/trains
Content-Type: application/json

{
  "trainNumber": 49845,
  "movementType": "LZ",
  "location": "Hauptbahnhof Stuttgart, Track 7",
  "description": "Locomotive stranded, needs rescue pull",
  "contactInfo": "dispatcher@bahn.de"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Train rescue request published successfully",
  "data": {
    "_id": "...",
    "trainNumber": 49845,
    "movementType": "LZ",
    "status": "active",
    "location": "Hauptbahnhof Stuttgart, Track 7",
    "description": "Locomotive stranded, needs rescue pull",
    "contactInfo": "dispatcher@bahn.de",
    "createdAt": "2026-08-18T...",
    "updatedAt": "2026-08-18T..."
  }
}
```

**Duplicate (409):**
```json
{
  "success": false,
  "message": "Train number 49845 is already registered in the platform. A second active request with the same train number cannot be created.",
  "code": "DUPLICATE_ACTIVE_TRAIN"
}
```

---

### Example: Resolve a Request

```bash
PATCH /api/trains/:id/status
Content-Type: application/json

{ "status": "completed" }
```

After this, train number `49845` becomes available again for new requests.

---

## Project Structure

```
railway-rescue-api/
├── src/
│   ├── app.js                   # Express app setup
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   └── trainController.js   # HTTP handlers
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handler
│   │   └── validateTrain.js     # Input validation
│   ├── models/
│   │   └── Train.js             # Mongoose schema + indexes
│   ├── routes/
│   │   ├── index.js             # Root router
│   │   └── trainRoutes.js       # /api/trains routes
│   ├── services/
│   │   └── trainService.js      # Business logic + duplicate check
│   └── utils/
│       └── response.js          # Response helpers
├── .env.example
├── package.json
└── server.js                    # Entry point
```

---

## Train Number Rules

- **Numeric only** — no letters or symbols
- **Max 6 digits** — range: 1 to 999,999
- **Movement type is separate** — enter `LZ` in the `movementType` field, not as part of the train number
- **Unique while active** — the same number cannot appear twice in `active` status