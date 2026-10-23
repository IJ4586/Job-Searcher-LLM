# MLHJobSearcherLLM

A local LLM which takes your job experience, searches the web and returns local job postings relevant to your experience and job preferences.


## TRY IT YOURSELF

You'll need [Ollama](https://ollama.com), Python 3, and Node.js.

```bash
# 1. Get the model (one time, large download)
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
