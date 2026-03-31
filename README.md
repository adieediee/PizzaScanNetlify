# PizzaScan

A Wizard of Oz annotation tool for pizza quality inspection research.

## Running the app

### Prerequisites
- Node.js (v18 or newer)

### Install dependencies

```sh
npm install
cd backend && npm install && cd ..
```

### Start the app

```sh
npm run dev
```

This starts both the frontend (Vite) and the backend logging server simultaneously.
Open your browser at `http://localhost:5173`.

---

## Getting started

### What to upload

PizzaScan is a **Wizard of Oz** prototype — the AI does not run a real model, it uses pre-defined annotations. To test the full workflow, upload the test image included in the project:

```
src/assets/images/good_pizzas.png
```

This image contains a standard pizza suitable for all scenarios below.

> For unsupported image scenarios (AI error flow), you can also try:
> `src/assets/images/pizza_banana.png` or `src/assets/images/pizza_sardine.png`

---

## Testing scenarios

### 1. AI Detection + AI Labeling (main flow)

1. Upload `good_pizzas.png`
2. Click **Detect** in the toolbar — this splits the pizza into 8 sub-images
3. Click **AI Labels** — the AI annotates all sub-images with defect boxes
4. Review the annotations in the right sidebar

### 2. Accepting AI annotations

- Click **Accept all** in the AI Annotation Summary to confirm all AI labels at once
- Or click individual annotations and accept them one by one
- Accepted annotations are converted to manual labels

### 3. Overriding AI annotations

- Click an AI annotation and change its defect type or delete it
- After 3 overrides with high-confidence annotations, a feedback toast appears asking why you overrode the AI

### 4. Manual annotation

- Use the annotation tools in the toolbar to draw boxes manually
- Works independently of AI detection

### 5. Deleting labels

- Right-click the image in the left sidebar for options to delete all labels or all AI labels
- After deletion, AI can be re-run on the same image

### 6. Statistics

- Statistics are available in the right sidebar under the **Project** tab
- They reflect only the main image annotations (sub-image annotations are not double-counted)

---

## Logging

The backend server (port `9090`) records all user interactions to a JSON log file in the `backend/` folder. Log files are named `log_<timestamp>.json`.
