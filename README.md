# BioChem Quiz (Hebrew, RTL)

A lightweight React quiz app for biochemistry practice. Loads questions from `public/questions.json` or a `?bank=URL` query param. Supports importing RAW text (`A) ...`, `ANSWER: X`) and JSON, tracks accuracy/streak locally.

## Run locally
```bash
npm i
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to GitHub Pages (with Actions)
1. Push this repo to GitHub.
2. In **Settings → Pages**, set **Source: GitHub Actions**.
3. The included workflow will build and deploy automatically on pushes to `main`.

Alternatively, you can build locally and host the `dist/` folder on any static host.

### Using a custom questions file
- Put a `questions.json` in `public/` (auto‑loaded), or
- Host it elsewhere and open the site with `?bank=https://.../questions.json`.

### JSON schema
```json
[
  {
    "id": 1,
    "text": "Glucose-6-phosphate הנו תוצר של איזה מסלול?",
    "options": [
      {"key": "A", "text": "כל התשובות נכונות"},
      {"key": "B", "text": "גליקוליזה"},
      {"key": "C", "text": "גלוקוניאוגנזה"},
      {"key": "D", "text": "מסלול הפנטוזות המזורחנות"}
    ],
    "answer": "A"
  }
]
```
