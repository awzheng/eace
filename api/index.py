"""
Vercel Serverless Function Entry Point
This wraps the FastAPI app for Vercel deployment.
"""

import os
import sys

# Add parent directory to path so we can import from root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import google.generativeai as genai

# Configure Gemini from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

app = FastAPI(title="eace", description="Easy ECE - Personal Electronics Learning Wiki")

# Determine base path (works for both local and Vercel)
if os.getenv("VERCEL"):
    BASE_DIR = Path("/var/task")
else:
    BASE_DIR = Path(__file__).parent.parent

CONTENT_DIR = BASE_DIR / "content"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

# Mount static files (only if directory exists and not on Vercel's restricted paths)
if STATIC_DIR.exists() and not os.getenv("VERCEL"):
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class ExplainRequest(BaseModel):
    text: str
    context: Optional[str] = None


def build_file_tree(directory: Path, base_path: Path = None) -> list:
    """Recursively build a file tree structure from the content directory."""
    if base_path is None:
        base_path = directory
    
    items = []
    
    try:
        entries = sorted(directory.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
    except (PermissionError, FileNotFoundError):
        return items
    
    for entry in entries:
        if entry.name.startswith('.'):
            continue
            
        relative_path = entry.relative_to(base_path)
        
        if entry.is_dir():
            children = build_file_tree(entry, base_path)
            if children:
                items.append({
                    "name": entry.name.replace('_', ' ').title(),
                    "path": str(relative_path),
                    "type": "directory",
                    "children": children
                })
        elif entry.suffix.lower() == '.md':
            items.append({
                "name": entry.stem.replace('_', ' ').title(),
                "path": str(relative_path),
                "type": "file"
            })
    
    return items


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main wiki interface."""
    index_path = TEMPLATES_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return HTMLResponse("<h1>eace</h1><p>Template not found</p>")


@app.get("/static/{path:path}")
async def serve_static(path: str):
    """Serve static files."""
    file_path = STATIC_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    raise HTTPException(status_code=404, detail="Static file not found")


@app.get("/tree")
async def get_file_tree():
    """Return a JSON tree of all markdown files in the content directory."""
    if not CONTENT_DIR.exists():
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
            detail="Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
        )
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    
    context_info = f" in the context of {request.context}" if request.context else ""
    
    prompt = f"""You are a friendly electronics engineering tutor helping a student understand technical concepts.

The student has highlighted the following text{context_info} and needs a simple explanation:

"{request.text}"

Please explain this concept in a clear, beginner-friendly way. Use:
1. Simple analogies (like water flow for current, pressure for voltage)
2. Real-world examples when possible
3. Key points in bullet form if helpful
4. Keep it concise but thorough

Remember: The student is learning electronics engineering, so relate concepts back to circuits and practical applications when relevant."""

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return {"explanation": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI explanation failed: {str(e)}")


# For Vercel
handler = app

