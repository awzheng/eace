"""
Vercel Serverless Function Entry Point
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import os

app = FastAPI()

# Determine base path for Vercel
BASE_DIR = Path(__file__).parent.parent
CONTENT_DIR = BASE_DIR / "content"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"


class ExplainRequest(BaseModel):
    text: str
    context: Optional[str] = None


def natural_sort_key(s):
    """Sort strings with numbers naturally (1, 2, 10 instead of 1, 10, 2)."""
    import re
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', s)]

def build_file_tree(directory: Path, base_path: Path = None) -> list:
    """Recursively build a file tree structure from the content directory."""
    if base_path is None:
        base_path = directory
    
    items = []
    
    try:
        entries = sorted(directory.iterdir(), key=lambda x: (x.is_file(), natural_sort_key(x.name)))
    except (PermissionError, FileNotFoundError):
        return items
    
    for entry in entries:
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
    index_path = TEMPLATES_DIR / "index.html"
    if index_path.exists():
        return HTMLResponse(content=index_path.read_text(encoding='utf-8'))
    return HTMLResponse("<h1>eace</h1><p>Template not found</p>")


@app.get("/static/{path:path}")
async def serve_static(path: str):
    """Serve static files."""
    file_path = STATIC_DIR / path
    if file_path.exists() and file_path.is_file():
        content = file_path.read_text(encoding='utf-8')
        
        # Set correct content type
        content_type = "text/plain"
        if path.endswith('.css'):
            content_type = "text/css"
        elif path.endswith('.js'):
            content_type = "application/javascript"
        
        return HTMLResponse(content=content, media_type=content_type)
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
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=503, 
            detail="Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
        )
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        context_info = f" (context: {request.context})" if request.context else ""
        
        prompt = f"""Explain this electronics concept in 2-4 sentences max{context_info}:

"{request.text}"

Rules:
- Be direct and concise
- Use a simple analogy if helpful
- No greetings, no "let me know if you have questions", no filler
- Just the explanation, nothing else"""

        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        return {"explanation": response.text}
    except ImportError:
        raise HTTPException(status_code=503, detail="AI service not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI explanation failed: {str(e)}")
