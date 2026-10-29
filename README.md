# CareerCue (MLHJobSearcherLLM)

A local LLM that takes your job experience, searches the web and returns job postings relevant to your experience and job preferences. Everything runs on your own computer: your profile is stored in a local SQLite file and scored by a model running in [Ollama](https://ollama.com).

## What it does

1. **Experience**: a full profile form (contact, summary, work history, projects, education, skills, languages, certifications, activities). Drop in a PDF, DOCX or TXT resume and the local model fills the form for you to review.
2. **Job preferences**: up to 10 target titles, schedule and job types, compensation, work setting, up to 3 work areas, commute and relocation, availability, home base, and a limit on how many postings to fetch.
3. **Job postings**: postings from Job Bank (Canada) and optional RSS/Atom feeds, scored 0–100 in batches by the local model, with a reason, matched skills and the biggest gap. Sort, filter, save and hide them.
4. **Settings and LLM**: Ollama address, model, context size, temperature, strictness, scoring weights, sources, plus export or delete all data.

If the model is not reachable, searches still run and fall back to keyword scoring, which is clearly labelled.

## Try it yourself

You'll need [Ollama](https://ollama.com), Python 3.10+, and Node.js 20+.

*bash*
```bash
# 1. Get the model (one time, large download). Any Ollama chat model works;
#    you can pick another one later in Settings.
ollama pull gemma4:e4b

# 2. Start the backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 3. In a second terminal, start the app
cd frontend
npm install
npm run dev -- --host
```
*powershell*
```powershell
# 1. Get the model
ollama pull gemma4:e4b

# 2. Start the backend
# Follow this forum post for "Microsoft C++ Build Tools": https://tinyurl.com/bdev44v7
# The 'python -m pip install -r requirements.txt' command will fail to execute if c++ build tools are not installed 
cd 'C:...\Job-Searcher-LLM\backend'
python -m venv .venv
.\.venv\scripts\activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload

# 3. In a second terminal, start the app
cd 'C:...\Job-Searcher-LLM\frontend'
npm install
npm run dev -- --host
```

Open the address Vite prints (usually http://localhost:5173).

### Optional environment variables (backend)

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434` | Starting Ollama address (can be changed in Settings) |
| `CAREERCUE_MODEL` | `gemma4:e4b` | Model used when none is picked in Settings |
| `CAREERCUE_DB` | `backend/careercue.db` | Where the SQLite file lives |

Databases from the first version are upgraded automatically on start.
