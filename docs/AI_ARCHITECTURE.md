# Drivo AI Architecture & Technical Interview Reference

This document provides a comprehensive technical breakdown of all AI/ML components integrated into **Drivo**. It is specifically structured to help you explain every design decision, algorithm, and mathematical formulation during technical engineering interviews.

---

## 1. High-Level Architecture Overview

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|  [Rider: AI ETA, Matching Progress, Context Support]                         |
|  [Captain: AI Repositioning Advice, Demand Hotspots, Driver Insights]         |
|  [Admin: AI Operational Command Center, Anomaly Table, Driver Rankings]      |
+-------------------------------------------------------------------------------+
                                      |
                      HTTP / REST & WebSocket (Socket.io)
                                      |
+-------------------------------------------------------------------------------+
|                            EXPRESS API GATEWAY                                |
|  Routes: /api/ai/*, /rides/*, /captains/*, /users/*, /payments/*             |
|  Real-Time Hub: socket.js (Rooms: user, captain, admin, captains)             |
+-------------------------------------------------------------------------------+
                                      |
+-------------------------------------------------------------------------------+
|                             AI ENGINE LAYER                                   |
|                                                                               |
|  1. driverMatchingService       -> Multi-factor composite ranking             |
|  2. demandPredictionService     -> Time-series zone demand forecasting        |
|  3. repositioningService        -> Driver spatial utility optimizer           |
|  4. etaPredictionService        -> Multi-variable traffic & zone ETA          |
|  5. anomalyDetectionService     -> GPS spoofing, fraud, and risk scoring      |
|  6. supportAssistantService     -> Context-aware dual-engine policy RAG       |
|  7. driverInsightService        -> Historical trip analytics & coaching       |
+-------------------------------------------------------------------------------+
                                      |
+-------------------------------------------------------------------------------+
|                             PERSISTENCE LAYER                                 |
|  MongoDB: rides, captains, users, payments, aiRiskLogs                        |
+-------------------------------------------------------------------------------+
```

---

## 2. Feature-by-Feature Technical Breakdown

### Feature 1: AI Driver-Rider Matching Engine (`driverMatchingService.js`)

#### Problem Solved
Traditional ride-hailing algorithms often rely naively on Euclidean or network distance to select the nearest driver. This often assigns disengaged, poorly rated, or high-cancellation drivers who reject the trip, resulting in dispatch churn and high pickup latency.

#### Formulation & Features Evaluated
For every candidate captain in the search radius:
1. **Proximity Score ($S_{prox}$)**: Distance decay function over Haversine distance $D$ (km):
   $$S_{prox} = \max(0, \min(100, 100 - (D \times 10)))$$
2. **Pickup ETA Score ($S_{eta}$)**:
   $$T_{eta} = 1.0 + (D \times 2.4 \text{ mins/km})$$
   $$S_{eta} = \max(0, \min(100, 100 - (T_{eta} \times 5)))$$
3. **Rating Score ($S_{rating}$)**: Normalizes 1.0–5.0 star rating to 0–100:
   $$S_{rating} = \left(\frac{R - 3.0}{2.0}\right) \times 100$$
4. **Acceptance Score ($S_{acc}$)**: Historical acceptance percentage $A \in [0, 100]$.
5. **Reliability Score ($S_{rel}$)**: On-time rate $P_{ontime}$ penalized by cancellation rate $C_{cancel}$:
   $$S_{rel} = \max(0, P_{ontime} - (C_{cancel} \times 2.5))$$
6. **Vehicle Compatibility ($S_{veh}$)**: 100 for exact match, 60 for secondary class.

#### Composite Decision Function:
$$\text{MatchScore} = 0.30 \cdot S_{prox} + 0.20 \cdot S_{eta} + 0.20 \cdot S_{acc} + 0.15 \cdot S_{rating} + 0.10 \cdot S_{rel} + 0.05 \cdot S_{veh}$$

#### Fallback Behavior
If geolocation metadata or ratings are missing, falls back to an ordinal distance sort to ensure zero disruption to booking flows.

---

### Feature 2: AI Demand Prediction (`demandPredictionService.js`)

#### Problem Solved
Static pricing and blind driver roaming cause spatial supply-demand mismatches (e.g., driver shortages at transit hubs during train arrivals).

#### Model Architecture
- **Geographic Partitioning**: Predefined centroid sectors (Kharagpur Railway Station, IIT Campus, Golbazar Commercial, Tech Park, NH-6 Junction, Residential).
- **Cyclical Multipliers**:
  - $M_{hour}(t)$: 24-hour diurnal curve (morning peak 8–10 AM $\sim 1.95$, evening peak 6–9 PM $\sim 2.20$, late night $\sim 0.25$).
  - $M_{day}(d)$: Day-of-week multiplier (e.g., Friday rush $\sim 1.35$, Monday commute $\sim 1.25$).
  - $V_{velocity}$: Rolling 2-hour completed/requested ride momentum from MongoDB.
- **Expected Demand Calculation**:
  $$\text{ExpectedRides}(z, t, d) = \text{Round}\left(\text{BaseRate}(z) \times M_{hour}(t) \times M_{day}(d) \times V_{velocity}\right)$$
- **Supply-Demand Ratio**:
  $$\text{Ratio} = \frac{\text{ExpectedRides}(z)}{\max(1, \text{AvailableCaptains}(z))}$$
- **Surge Recommendation**:
  $$\text{Surge} = \begin{cases} 1.8\times & \text{if Ratio} \ge 2.0 \\ 1.4\times & \text{if Ratio} \ge 1.5 \\ 1.15\times & \text{if Ratio} \ge 1.2 \\ 1.0\times & \text{otherwise} \end{cases}$$

---

### Feature 3: Intelligent Driver Repositioning (`repositioningService.js`)

#### Problem Solved
Drivers often idle in saturated or low-activity areas, burning fuel or losing earning potential.

#### Optimization Algorithm
Utility maximization considering opportunity density and driving distance cost:
$$\text{Utility}(z) = \frac{\text{ExpectedRides}(z)}{\text{AvailableCaptains}(z) + 1} \times \frac{1}{1 + 0.18 \times \text{DistanceKm}(\text{driver}, z)}$$

- **Probability Boost Calculation**:
  $$\Delta P = \min(65, \max(12, \text{Round}((\text{Ratio} - 0.8) \times 28)))$$
- **Dynamic Context Guidance**:
  If distance $\le 0.8$ km: "You are currently stationed in [Zone], which is in peak demand. Remain active nearby."
  If distance $> 0.8$ km: "High demand expected near [Zone] in 15 minutes. Moving 1.4 km could increase your ride probability by 38%."

---

### Feature 4: Multi-Factor AI ETA Prediction (`etaPredictionService.js`)

#### Problem Solved
Standard map routing returns static road-speed estimates that fail to account for urban rush hour bottlenecks, railway crossings, or passenger boarding delays.

#### Formulation
$$\text{ETA}_{AI} = \max\left(T_{base}, \text{Round}\left(T_{base} \times C_{tod} \times C_{dow} \times C_{zone}\right) + \delta_{buffer}\right)$$
Where:
- $T_{base}$: Base Mapbox routing duration.
- $C_{tod}$: Time-of-day traffic congestion multiplier (up to $1.55\times$ during peak hours).
- $C_{dow}$: Day-of-week factor ($1.15\times$ during weekend evenings).
- $C_{zone}$: Localized bottleneck multiplier (e.g., station/market keyword matching triggers $1.25\times - 1.30\times$).
- $\delta_{buffer}$: 1–2 minutes dynamic buffer for stoplights and boarding.

---

### Feature 5: AI Ride Anomaly & Fraud Detection (`anomalyDetectionService.js`)

#### Problem Solved
Ride-hailing platforms face GPS spoofing, fraudulent instant ride completions to claim promotions, and repeated abusive cancellations.

#### Heuristic Rules & Scoring Model
1. **Impossible Speed Jump (GPS Spoofing)**:
   $$\text{Speed} = \frac{D_{\text{km}}}{T_{\text{hours}}} > 150 \text{ km/h} \implies +45 \text{ risk points}$$
2. **Instant Trip Completion**:
   $$D > 2 \text{ km and } T < 60 \text{ seconds} \implies +40 \text{ risk points}$$
3. **Abnormal Trip Duration (Meter Stalling)**:
   $$T_{\text{actual}} > 4.0 \times T_{\text{expected}} \implies +25 \text{ risk points}$$
4. **Elevated Cancellation Velocity**:
   $$\text{CancellationRate} > 35\% \implies +20 \text{ risk points}$$
5. **Payment Failure Spike**:
   $$\text{FailedAttempts} \ge 2 \implies +15 \times \text{Failures points}$$

#### Risk Categorization & Action:
- $0 - 39$: **LOW** $\rightarrow$ Normal ride, no intervention.
- $40 - 69$: **MEDIUM** $\rightarrow$ Flagged internally in audit log.
- $70 - 100$: **HIGH** $\rightarrow$ Flagged for admin review; real-time `high-risk-ride` alert emitted to admin room via WebSocket. Zero automatic bans to avoid false positives.

---

### Feature 6: Context-Aware Customer Support Assistant (`supportAssistantService.js`)

#### Problem Solved
Generic AI chatbots fabricate cancellation terms or refund policies, causing customer disputes.

#### Dual-Engine Design
1. **Context Extraction**: Queries authenticated user's recent rides and payments directly from MongoDB.
2. **Deterministic Grounded RAG (Primary/Fallback)**:
   - Matches question intent against Drivo's official policy database (cancellation rules, 3-min grace window, ₹50 fee, 3–5 day refund turnaround, lost item retrieval protocol).
   - Injects user's exact last trip date, destination, fare, and payment status into the response.
3. **LLM Synthesis (when `GEMINI_API_KEY` is present)**:
   - Prompts Google Gemini with zero-hallucination guardrails and the verified policy document.
4. **Safe Escalation**:
   - Out-of-scope or uncertain queries provide Drivo's 24/7 human support hotline (+91-1800-DRIVO) and support email.

---

### Feature 7: AI Driver Analytics & Coaching (`driverInsightService.js`)

#### Problem Solved
Captains lack visibility into their performance trends and peak revenue hours.

#### Dynamic Formulations
- **Peak Earning Window**: Partitions all historical payments into 3-hour diurnal slots (`06:00-09:00`, `09:00-12:00`, `12:00-15:00`, `15:00-18:00`, `18:00-21:00`, `21:00-00:00`, `00:00-06:00`). Computes earnings per slot and highlights the highest yielding window.
- **Cancellation Distance Correlation**: Analyzes whether captain has higher cancellation rates on short (< 2 km) vs long (> 8 km) trips.
- **Dynamic Coaching Generation**: Translates raw metrics into actionable advice without hardcoded static templates.

---

## 3. How to Present this in a Technical Interview

When interviewers ask about this project, follow this 4-step framework:

1. **State the Business Context**:
   > *"Drivo is an Uber-like ride-hailing platform with real-time tracking and dispatch. Rather than adding a superficial chatbot, I engineered an AI layer solving real operational bottlenecks: dispatch efficiency, spatial demand forecasting, predictive ETAs, and fraud detection."*

2. **Explain the Matching Engine vs Naive Nearest-Neighbor**:
   > *"Standard nearest-driver dispatch leads to driver rejection churn. I built an explainable multi-factor scoring engine that weighs proximity (30%), pickup ETA (20%), historical acceptance rate (20%), driver rating (15%), and reliability (10%). This increased dispatch acceptance and is completely modular so a learned ranking model can drop in."*

3. **Highlight Fault Tolerance & Production Quality**:
   > *"Every AI service is built with defensive defaults. If external APIs or ML services fail, the system falls back gracefully—demand forecasting uses historical baselines, ETA defaults to robust urban speed heuristics, and support assistant uses a deterministic policy engine if LLM tokens expire. The app never crashes."*

4. **Discuss Real-Time WebSockets**:
   > *"The AI services are tightly coupled to our Socket.IO architecture. High-risk rides emit instant alerts to the admin room, surge zones trigger real-time driver notifications, and riders receive live AI ETA updates."*
