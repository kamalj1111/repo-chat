"""
Central place for configuration / environment variables.
Loads from a local .env file if present (see .env.example).
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Postgres / Supabase connection string, e.g.:
# postgresql://postgres:password@localhost:5432/repochat
# or the "Connection string" from your Supabase project settings.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/repochat")

# Max number of source files we will parse per repo. Keeps local runs fast
# and predictable. Raise this once you know how big the repos you care
# about actually are.
MAX_FILES_PER_REPO = int(os.getenv("MAX_FILES_PER_REPO", "500"))

# File extensions we know how to parse. Everything else is ignored.
PYTHON_EXTENSIONS = {".py"}
JS_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}
SUPPORTED_EXTENSIONS = PYTHON_EXTENSIONS | JS_EXTENSIONS

# Directories we never want to walk into.
IGNORED_DIRS = {
    ".git", "node_modules", "venv", ".venv", "__pycache__",
    "dist", "build", ".next", ".turbo", "coverage", "site-packages",
}

# Where repos get cloned to temporarily during analysis.
CLONE_ROOT = os.getenv("CLONE_ROOT", "/tmp/repo-chat-clones")

# CORS - the frontend dev server origin.
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# NVIDIA API Catalog settings
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")
NVIDIA_INVOKE_URL = os.getenv("NVIDIA_INVOKE_URL", "https://integrate.api.nvidia.com/v1/chat/completions")

# Supabase DB Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_qgbdYDotVuQUSqypl2-gUA_G8INybfT")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY", "")
