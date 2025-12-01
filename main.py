"""
eace - Easy ECE: A minimalist learning wiki for electronics engineering.
"""

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

app = FastAPI(title="eace", description="Easy ECE - Personal Electronics Learning Wiki")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Base content directory
CONTENT_DIR = Path("content")


class ExplainRequest(BaseModel):
    text: str
    context: Optional[str] = None


class FileNode(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    children: Optional[list] = None


import re

def natural_sort_key(s):
    """Sort strings with numbers naturally (1, 2, 10 instead of 1, 10, 2)."""
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', s)]

def build_file_tree(directory: Path, base_path: Path = None) -> list:
    """Recursively build a file tree structure from the content directory."""
    if base_path is None:
        base_path = directory
    
    items = []
    
    try:
        entries = sorted(directory.iterdir(), key=lambda x: (x.is_file(), natural_sort_key(x.name)))
    except PermissionError:
        return items
    
    for entry in entries:
        # Skip hidden files
        if entry.name.startswith('.'):
            continue
            
        relative_path = entry.relative_to(base_path)
        
        if entry.is_dir():
            children = build_file_tree(entry, base_path)
            items.append({
                "name": entry.name.replace('_', ' '),
                "path": str(relative_path),
                "type": "directory",
                "children": children if children else []
            })
        elif entry.suffix.lower() == '.md':
            items.append({
                "name": entry.stem.replace('_', ' '),
                "path": str(relative_path),
                "type": "file"
            })
    
    return items


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main wiki interface."""
    return FileResponse("templates/index.html")


@app.get("/tree")
async def get_file_tree():
    """Return a JSON tree of all markdown files in the content directory."""
    if not CONTENT_DIR.exists():
        CONTENT_DIR.mkdir(parents=True)
        return []
    
    tree = build_file_tree(CONTENT_DIR)
    return tree


@app.get("/content/{path:path}")
async def get_content(path: str):
    """Return the raw markdown content of a specific file."""
    file_path = CONTENT_DIR / path
    
    # Security: ensure the path doesn't escape the content directory
    try:
        file_path = file_path.resolve()
        if not str(file_path).startswith(str(CONTENT_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid path")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not file_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    try:
        content = file_path.read_text(encoding='utf-8')
        return {"content": content, "path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.post("/explain")
async def explain_text(request: ExplainRequest):
    """Use Gemini to explain the selected text simply."""
    if not api_key:
        raise HTTPException(
            status_code=503, 
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in .env"
        )
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    
    # Build the prompt
    context_info = f" (context: {request.context})" if request.context else ""
    
    prompt = f"""Explain this electronics concept in 2-4 sentences max{context_info}:

"{request.text}"

Rules:
- Be direct and concise
- Use a simple analogy if helpful
- No greetings, no "let me know if you have questions", no filler
- Just the explanation, nothing else"""

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        return {"explanation": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI explanation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

