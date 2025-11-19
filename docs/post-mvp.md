# CleanMod – Post-MVP Roadmap

These are ideas and improvements to tackle after the initial MVP is live and usable.

## 1. FastAPI Inference Service with Unitary Loaded

- Build a separate Python microservice using FastAPI.
- Load `unitary/multilingual-toxic-xlm-roberta` (and/or other models) into memory on startup.
- Expose a simple HTTP endpoint, e.g. `POST /predict`:
  - Request: `{ "text": "..." }`
  - Response: raw model scores for toxicity categories.
- Replace Hugging Face Inference API calls in the Node/Next.js backend with calls to this internal service.
- Benefits:
  - Lower latency (warm model, no external network hop).
  - Full control over batching, quantization, and model versions.
  - Better cost profile at scale.
  - Clearer “no third-party inference” story for privacy-sensitive customers.

## 2. (reserved for future ideas)

- To be filled as product evolves.
