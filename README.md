# Kinectra Labs 🏏

> **One-Sentence Claim:** Kinectra is a real-time, voice-guided biomechanics coaching agent that extracts skeletal landmarks, evaluates posture safety, and uses Qdrant Cloud vector search to match athletic form against professional benchmarks.

---

## 1. The Problem
During high-intensity sports training (like cricket nets), athletes cannot look at a laptop screen or interact with a keyboard. If their posture collapses (e.g., knee collapsing on landing or elbow bending illegally), they risk repetitive stress injuries and poor power transfer.

**Kinectra** solves this by providing a **hands-free, real-time voice coach (Coach Aryan)**. By running low-latency computer vision in the browser and expressive Rime Speech feedback, the athlete receives immediate spoken biomechanical corrections while practicing.

---

## 2. Architecture & Data Flow

```mermaid
graph TD
    A[Webcam Feed / Player Frame] --> B[MediaPipe Landmarker SDK]
    B --> C[3D Joint Angle Extraction]
    C --> D[Real-time Score & Warning Engine]
    D -->|Post-Flexion Capture| E[Skeletal Pose Vector [4D]]
    D -->|Form Deviation Trigger| F[Rime TTS backend /api/speech/synthesize]
    F -->|Binary MP3 Stream| G[Coach Aryan Voice Alert]
    E -->|Session End| H[Qdrant Cloud Similarity Search]
    H -->|Cosine Similarity Match| I[Pro Player Pose Matcher Card]
```

---

## 3. Technology Anchor

*   **Voice Engine (Rime AI):** Uses the fast, conversational **`ursa` voice on the `coda` model** via a proxy backend endpoint to generate realistic vocal alerts and clear up-and-down pitch delivery.
*   **Vector Database (Qdrant Cloud):** Stores 4-dimensional biomechanical keyframe embeddings (`[elbowAngle, spineTilt, kneeAngle, shoulderAlignment]`). Queries are evaluated using Cosine Similarity to find the closest professional player baseline.
*   **Application Layer:** Express backend, React + Vite frontend, MediaPipe Vision Tasks, and Gemini AI.

---

## 4. How to Run

### Prerequisite Environment
Create a `.env` file in the root directory:
```env
PORT=8085
NODE_ENV=development
DATABASE_URL=your_postgresql_url
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
RIME_API_KEY=your_rime_api_key
JWT_SECRET=your_jwt_secret
```

### Setup & Startup Commands
Install dependencies and build the workspace:
```bash
# Install root and workspace dependencies
npx pnpm install --ignore-scripts

# Build core API server and Web application
npx pnpm --filter @workspace/api-server run build
npx pnpm --filter @workspace/kinectra run build

# Start the Backend Server (Port 8085)
npx pnpm --filter @workspace/api-server run start

# Start the Frontend Dev Server (Port 24564)
npx pnpm --filter @workspace/kinectra run dev
```

---

## 5. Biomechanical Proof & Scoring Metrics
Kinectra enforces realistic cricket regulations:
1.  **Elbow Extension (ICC Law 17.2):** Expects a straight arm (165°–180°). Warns of *"Illegal elbow flexion"* if the arm bends below 150° during release to flag chucking.
2.  **Braced Knee Landing:** Evaluates landing stability (145°–165°). Collapsing under 130° triggers a *"Collapsed front landing knee"* warning.
3.  **Lateral Spine Tilt:** Natural lean is capped between 5° and 22°. Excessive leans trigger warning alerts to protect the lower back.

---

## 6. Known Limitations
*   **2D Camera Projection:** Tilt angles are calculated on 2D pixel coordinates which can introduce slight scaling differences if the camera is not fully level or side-on.
*   **Lighting conditions:** Poor contrast or dark rooms can degrade MediaPipe landmark confidence thresholds.
