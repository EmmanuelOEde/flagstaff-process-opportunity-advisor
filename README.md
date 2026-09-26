# Flagstaff Process Opportunity Advisor

A static browser application for guided business-process discovery.

## Reviewer experience
Open the GitHub Pages link, click **Start process review**, and use the application. No account, API key, server, Python environment, or installation is required.

## How it works
- Static HTML/CSS/JavaScript
- Transformers.js
- Qwen2.5-0.5B-Instruct, 4-bit quantized
- Model inference occurs locally in the browser using WebGPU
- The first visit downloads the model files; later visits can reuse the browser cache
- No process answers are intentionally sent to an application backend

## Dependencies
- Internet access on first load to retrieve JavaScript/model files
- A current browser/device with WebGPU support (current Chrome/Edge recommended)
- GitHub Pages for static hosting
- Hugging Face hosts the public model files
- jsDelivr serves the Transformers.js browser module

## Cost and accounts
- Application hosting: GitHub Pages, $0
- Model/API charges: none
- Reviewer account: none
- API key: none
- Reviewer installation: none

## Run/reproduce
Because this is a static site, serve the repository with any static web server or enable GitHub Pages. Opening via `file://` is not recommended because browser security rules can interfere with module/model loading.

## Important limitation
Browser-side inference trades infrastructure simplicity for client compatibility and model capability. WebGPU is not universal, and a small local model will not reason as strongly as a large hosted model. The included prompt deliberately keeps the task narrow and structured.

## Files
- `index.html` — interface
- `style.css` — presentation
- `app.js` — local model loading, conversation, and report download
- `agent_prompt.md` — readable copy of the agent instructions
