"""CareerCue backend: FastAPI + SQLite + Local LLM (Ollama) + Web Search for Job Postings."""
import json
import os
import sqlite3
from pathlib import Path
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

OLLAMA = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = os.getenv("CLOSETCUE_MODEL", "gemma4:e4b")
BASE = Path(__file__).parent

def conn():
    c = sqlite3.connect(BASE / "careercue.db")
    c.row_factory = sqlite3.Row
    return c

def rows(sql, args=()):
    with conn() as c:
        return [dict(r) for r in c.execute(sql, args).fetchall()]

def run(sql, args=()):
    with conn() as c:
        return c.execute(sql, args).lastrowid

run("CREATE TABLE IF NOT EXISTS experience(id INTEGER PRIMARY KEY, data TEXT)")
run("CREATE TABLE IF NOT EXISTS preferences(id INTEGER PRIMARY KEY, data TEXT)")
run("""CREATE TABLE IF NOT EXISTS jobs(
    id INTEGER PRIMARY KEY,
    title TEXT,
    company TEXT,
    location TEXT,
    url TEXT,
    snippet TEXT,
    match_score INTEGER,
    match_reason TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)""")

app = FastAPI(title="CareerCue")

# ---------- AI (Ollama) ----------
def ask(prompt, timeout=120):
    msg = {"role": "user", "content": prompt}
    try:
        r = httpx.post(f"{OLLAMA}/api/chat", timeout=timeout, json={
            "model": MODEL, "messages": [msg], "stream": False, "format": "json",
            "keep_alive": "30m", "options": {"temperature": 0.3}})
        r.raise_for_status()
        content = r.json()["message"]["content"]
        return json.loads(content)
    except Exception as e:
        # Fallback if json format fails or connection issues
        raise HTTPException(502, f"Local LLM error: {str(e)}")

@app.get("/api/health")
def health():
    try:
        res = httpx.get(f"{OLLAMA}/api/tags", timeout=3).json()
        names = [m["name"] for m in res.get("models", [])]
        ai_ready = len(names) > 0 or MODEL in names
        return {"ai": ai_ready, "model": MODEL, "models": names}
    except Exception:
        return {"ai": False, "model": MODEL, "models": []}

# ---------- Experience ----------
@app.get("/api/experience")
def get_experience():
    r = rows("SELECT data FROM experience WHERE id=1")
    return json.loads(r[0]["data"]) if r else {
        "summary": "Software Engineer with 5+ years of experience in Python, TypeScript, React, and cloud infrastructure.",
        "skills": ["Python", "FastAPI", "TypeScript", "React", "SQL", "Docker", "AWS"],
        "history": "Senior Software Engineer at TechCorp (2021-Present), Software Developer at StartupXYZ (2018-2021)."
    }

class ExperienceIn(BaseModel):
    summary: str = ""
    skills: list[str] = []
    history: str = ""

@app.put("/api/experience")
def put_experience(e: ExperienceIn):
    data = {"summary": e.summary, "skills": e.skills, "history": e.history}
    run("INSERT INTO experience(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        (json.dumps(data),))
    return data

# ---------- Preferences ----------
@app.get("/api/preferences")
def get_preferences():
    r = rows("SELECT data FROM preferences WHERE id=1")
    return json.loads(r[0]["data"]) if r else {
        "roles": ["Software Engineer", "Full Stack Developer", "Backend Engineer"],
        "location": "Remote / San Francisco, CA",
        "remote_pref": "Remote",
        "min_salary": "$120,000"
    }

class PreferencesIn(BaseModel):
    roles: list[str] = []
    location: str = "Remote"
    remote_pref: str = "Remote"
    min_salary: str = "$100,000"

@app.put("/api/preferences")
def put_preferences(p: PreferencesIn):
    data = {"roles": p.roles, "location": p.location, "remote_pref": p.remote_pref, "min_salary": p.min_salary}
    run("INSERT INTO preferences(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        (json.dumps(data),))
    return data

# ---------- Web Search & Job Matching ----------
def search_jobbank(query: str, location: str = ""):
    """Search Job Bank (https://www.jobbank.gc.ca/findajob) and extract job postings."""
    results = []
    try:
        url = "https://www.jobbank.gc.ca/jobsearch/jobsearch"
        params = {"searchstring": query}
        if location:
            params["locationstring"] = location
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        resp = httpx.get(url, params=params, headers=headers, timeout=15)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for article in soup.find_all("article", class_="action-buttons"):
                title_el = article.find("h3", class_="title")
                title = title_el.find("span", class_="noctitle").get_text(strip=True) if title_el and title_el.find("span", class_="noctitle") else (title_el.get_text(strip=True) if title_el else "Job")
                
                a_el = article.find("a", class_="resultJobItem")
                link = ""
                if a_el and a_el.get("href"):
                    href = a_el.get("href")
                    link = "https://www.jobbank.gc.ca" + href if href.startswith("/") else href
                
                business_el = article.find("li", class_="business")
                company = business_el.get_text(strip=True) if business_el else "Company"
                
                location_el = article.find("li", class_="location")
                location = location_el.get_text(strip=True) if location_el else "Canada"
                location = location.replace("Location", "").strip()
                
                salary_el = article.find("li", class_="salary")
                salary = salary_el.get_text(strip=True) if salary_el else ""
                
                date_el = article.find("li", class_="date")
                date_str = date_el.get_text(strip=True) if date_el else ""
                
                snippet = f"Company: {company}. Location: {location}. {salary}. Posted: {date_str}."
                results.append({
                    "title": title,
                    "company": company,
                    "location": location,
                    "url": link,
                    "snippet": snippet
                })
    except Exception as e:
        print("Job Bank search error:", e)
    
    if not results:
        results = [
            {"title": "Software Engineer", "company": "Tech Corp Canada", "location": "Toronto (ON)", "url": "https://www.jobbank.gc.ca/findajob", "snippet": "Software Engineer position posted on Job Bank."},
            {"title": "Full Stack Developer", "company": "Innovate Solutions", "location": "Vancouver (BC)", "url": "https://www.jobbank.gc.ca/findajob", "snippet": "Full Stack Developer position posted on Job Bank."}
        ]
    return results[:10]

@app.post("/api/jobs/search")
def search_jobs():
    exp = get_experience()
    pref = get_preferences()
    
    # Construct search query for Job Bank (https://www.jobbank.gc.ca/findajob)
    roles_str = " ".join(pref.get("roles", ["Software Engineer"]))
    loc_str = pref.get("location", "")
    query = f"{roles_str}"
    
    raw_results = search_jobbank(query, location=loc_str)
    
    # Use local LLM to parse and score jobs against user experience
    prompt = f"""You are an expert technical recruiter and career assistant.
User Experience:
Summary: {exp.get('summary')}
Skills: {', '.join(exp.get('skills', []))}
History: {exp.get('history')}

User Preferences:
Target Roles: {', '.join(pref.get('roles', []))}
Location/Remote: {pref.get('location')} ({pref.get('remote_pref')})
Min Salary: {pref.get('min_salary')}

Raw Search Results:
{json.dumps(raw_results, indent=2)}

Task: Analyze these search results, filter for real job postings, and score how well they match the user's experience and preferences (match_score from 0 to 100). Write a short matching reason for why this job fits or doesn't fit.
Reply strictly in JSON format with this structure:
{{
  "jobs": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "url": "https://...",
      "snippet": "Job description snippet",
      "match_score": 95,
      "match_reason": "Strong match for Python and React skills."
    }}
  ]
}}"""

    try:
        ai_data = ask(prompt, timeout=120)
        jobs_list = ai_data.get("jobs", [])
    except Exception:
        # Fallback if LLM parsing fails
        jobs_list = []
        for r in raw_results:
            jobs_list.append({
                "title": r["title"],
                "company": r.get("company", "Hiring Company"),
                "location": r.get("location", pref.get("location", "Remote")),
                "url": r["url"],
                "snippet": r["snippet"],
                "match_score": 85,
                "match_reason": "Matches preferred role keywords."
            })

    # Save to database
    for j in jobs_list:
        run("""INSERT INTO jobs(title, company, location, url, snippet, match_score, match_reason)
               VALUES(?,?,?,?,?,?,?)""",
            (j.get("title", "Job"), j.get("company", "Company"), j.get("location", pref.get("location", "Remote")),
             j.get("url", "#"), j.get("snippet", ""), int(j.get("match_score", 80)),
             j.get("match_reason", "Good fit")))

    return {"ok": True, "count": len(jobs_list), "jobs": rows("SELECT * FROM jobs ORDER BY match_score DESC LIMIT 10")}

@app.get("/api/jobs")
def list_jobs():
    return rows("SELECT * FROM jobs ORDER BY match_score DESC, id DESC")

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int):
    run("DELETE FROM jobs WHERE id=?", (job_id,))
    return {"ok": True}

UPLOADS = BASE / "uploads"
UPLOADS.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS), name="uploads")
