# Drivo — AI-Powered Intelligent Ride-Hailing Platform

Drivo is a production-quality, intelligent Uber-like ride-hailing application built with a Node.js/Express backend, React frontend, real-time WebSocket communication, and an **integrated AI/ML decision engine**.

---

## Key AI/ML Features

1. **AI Driver-Rider Matching Engine (`driverMatchingService`)**:
   - Multi-factor ranking: proximity (30%), pickup ETA (20%), driver acceptance rate (20%), rating (15%), and reliability (10%).
   - Transparent scoring (0–100) with detailed factor breakdowns and explanations.
   - Modular interface allowing drop-in ML ranking models.

2. **AI Demand Prediction & Heatmaps (`demandPredictionService`)**:
   - Time-series demand forecasting across geographic urban sectors (Kharagpur Station, IIT Campus, Commercial Hubs).
   - Diurnal 24-hour hourly curves, day-of-week weights, and real-time rolling ride velocity.
   - Outputs: predicted demand level (`LOW`, `MEDIUM`, `HIGH`, `SURGE`), expected ride counts, driver supply, and recommended surge multipliers.

3. **Intelligent Driver Repositioning (`repositioningService`)**:
   - Recommends high-opportunity zones to active drivers to minimize idle time and balance fleet distribution.
   - Computes distance-penalized spatial utility and estimated ride probability boost (+X%).

4. **Multi-Factor AI ETA Prediction (`etaPredictionService`)**:
   - Computes accurate arrival estimates factoring in base distance, time-of-day traffic congestion curves, day-of-week variations, and localized bottleneck indices.
   - Displays real-time traffic condition tags (`Normal Flow`, `Heavy Congestion`).

5. **AI Ride Anomaly & Fraud Detection (`anomalyDetectionService`)**:
   - Flags suspicious ride behavior: GPS spoofing / teleportation (> 150 km/h), instant trip completions (< 60s), extreme duration deviations (> 4x), abnormal cancellation spikes, and payment failure bursts.
   - Risk scoring (0–100, `LOW` / `MEDIUM` / `HIGH`) with non-blocking review audit logs.

6. **Context-Aware AI Customer Support Assistant (`supportAssistantService`)**:
   - Dual-engine architecture: Grounded semantic policy RAG + Google Gemini synthesis.
   - Inspects the authenticated user's recent rides, fares, and transaction history to answer specific billing and trip questions without hallucinating policies.

7. **AI Driver Analytics & Coaching (`driverInsightService`)**:
   - Analyzes driver trip histories to formulate personalized coaching insights, peak earning hours (e.g. 6 PM – 9 PM yields +24%), and acceptance rate comparisons.

8. **Admin AI Operational Command Center**:
   - Real-time active rides, citywide demand-supply ratios, interactive zone forecasts, flagged fraud review table, driver performance leaderboards, and automated operational bottleneck alerts.

---

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB (Mongoose 8), Socket.IO 4, JWT, bcrypt, Axios, Jest, Supertest.
- **Frontend**: React 18, Vite 5, TailwindCSS 3, Mapbox GL, Framer Motion, GSAP, Lucide React, Remixicon.
- **AI/ML Layer**: Dedicated modular services in `Backend/services/ai/` with mathematical scoring, statistical heuristics, and optional LLM grounding via Gemini.

---

## Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT APPS                                     |
|  [Rider View: AI ETA, Support Assistant]  [Captain View: Repositioning, Insights]|
|                    [Admin View: AI Command Center]                              |
+---------------------------------------------------------------------------------+
                                       |
                     REST APIs & WebSockets (Socket.IO)
                                       |
+---------------------------------------------------------------------------------+
|                             BACKEND API GATEWAY                                 |
|   /users/*  |  /captains/*  |  /rides/*  |  /payments/*  |  /api/ai/*           |
+---------------------------------------------------------------------------------+
                                       |
+---------------------------------------------------------------------------------+
|                                AI SERVICES                                      |
|  • driverMatchingService      • demandPredictionService  • repositioningService |
|  • etaPredictionService       • anomalyDetectionService  • supportAssistant     |
|  • driverInsightService                                                         |
+---------------------------------------------------------------------------------+
                                       |
+---------------------------------------------------------------------------------+
|                               DATABASE LAYER                                    |
|  MongoDB: rides, captains, users, payments, aiRiskLogs                          |
+---------------------------------------------------------------------------------+
```

---

## API Documentation

### AI Endpoints

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/ai/driver-match` | `POST` | Rank available drivers for a ride | Optional |
| `/api/ai/demand-prediction` | `GET` | Predicted demand for a zone or coordinates | No |
| `/api/ai/demand-zones` | `GET` | Citywide demand forecasts for all zones | No |
| `/api/ai/driver-reposition` | `GET` | Personalized repositioning advice | Captain |
| `/api/ai/driver-insights` | `GET` | Driver performance analytics & coaching | Captain |
| `/api/ai/predict-eta` | `POST` | Multi-factor AI ETA prediction | No |
| `/api/ai/evaluate-risk` | `POST` | Ride anomaly and fraud evaluation | No |
| `/api/ai/support-chat` | `POST` | Context-aware AI support assistant | Optional |
| `/api/ai/admin-dashboard` | `GET` | Aggregated AI operational metrics | User / Admin |

---

## Environment Variables

### Backend (`Backend/.env`)
```env
PORT=4000
DB_CONNECT=mongodb+srv://<username>:<password>@cluster.mongodb.net/drivo
LOCAL_DB_CONNECT=mongodb://127.0.0.1:27017/drivo
JWT_SECRET=your_jwt_secret_key
MAPBOX_API=your_mapbox_token
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=optional_gemini_api_key_for_support_llm
```
*Note: If `DB_CONNECT` is unreachable, the system automatically falls back to `LOCAL_DB_CONNECT`.*

### Frontend (`frontend/.env`)
```env
VITE_BASE_URL=http://localhost:4000
VITE_MAPBOX_TOKEN=your_mapbox_token
```

---

## Setup & Running Locally

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (local running on port 27017 or MongoDB Atlas connection string)

### 2. Backend Setup
```bash
cd Backend
npm install
npm test          # Run automated AI test suite (34 tests)
npm start         # Starts backend on http://localhost:4000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build     # Verify production build
npm run dev       # Starts Vite dev server on http://localhost:5173
```

---

## Automated Test Results
- **Driver Matching**: Normalized scoring, weight balancing, ordinal ranking, empty driver handling, fallback logic.
- **Demand Prediction**: Zone mapping, hourly diurnal curves, day-of-week multipliers, supply-demand ratios.
- **Repositioning**: Spatial utility, distance penalty, probability boost calculation.
- **ETA Prediction**: Traffic curves, bottleneck keyword multipliers, confidence metrics.
- **Anomaly Detection**: GPS teleportation (> 150 km/h), instant completion, duration anomaly, payment failure bursts.
- **Support Assistant**: Grounded policy retrieval, user context extraction, safe human escalation.
- **API Integration**: Supertest integration across all `/api/ai/*` endpoints.

---

## Technical Interview Reference
See [docs/AI_ARCHITECTURE.md](file:///Users/skarifahmed/Documents/Files/codes/Drivo-Ride-Booking/docs/AI_ARCHITECTURE.md) for a technical breakdown of each AI algorithm, mathematical formulations, and step-by-step interview talking points.
