import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.models import (
    Research, Dataset, Experiment, ActivityLog, EarthBookmark
)

logger = logging.getLogger("system")

# Approved files directories & configuration limits
APPROVED_DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs"))
MAX_FILES_SCANNED = 50
MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024  # 1 MB
SAFE_EXTENSIONS = {".md", ".txt", ".csv", ".json"}

# Predefined Setting Shortcuts
SETTINGS_SHORTCUTS = [
    {
        "id": "shortcut-volume",
        "type": "setting",
        "title": "Adjust Master Audio Volume",
        "description": "Adjust cockpit background audio and master sound effects volume levels.",
        "url": "/settings?focus=volume",
        "keywords": ["volume", "sound", "audio", "mute", "master", "loudness"]
    },
    {
        "id": "shortcut-theme",
        "type": "setting",
        "title": "Configure Cockpit Theme Preferences",
        "description": "Switch UI rendition styles: Standard Cyan, Arctic, Midnight, Deep Space Red.",
        "url": "/settings?focus=theme",
        "keywords": ["theme", "color", "style", "arctic", "midnight", "deepspace", "look", "visual"]
    },
    {
        "id": "shortcut-performance",
        "type": "setting",
        "title": "Set Graphics Rendition Quality Mode",
        "description": "Configure performance mode toggle between Graphics Quality and High Performance FPS.",
        "url": "/settings?focus=performance",
        "keywords": ["performance", "fps", "graphics", "quality", "speed", "render", "resolution"]
    },
    {
        "id": "shortcut-notifications",
        "type": "setting",
        "title": "Toggle Cockpit System Notifications Logs",
        "description": "Enable or disable global system-wide warning logs toast alerts pops.",
        "url": "/settings?focus=notifications",
        "keywords": ["notification", "alert", "toast", "popups", "enable", "disable"]
    }
]

class SearchService:
    @staticmethod
    def calculate_score(query: str, text: str, title: str = "") -> float:
        """
        Calculate deterministic relevance score [0.0 - 1.0].
        """
        q = query.lower().strip()
        if not q:
            return 0.0
        
        t_lower = text.lower()
        title_lower = title.lower()

        # Exact title match / prefix bonus
        if title_lower == q:
            return 1.0
        if title_lower.startswith(q):
            return 0.95
        if q in title_lower:
            return 0.80
        
        # Word matches density
        words = q.split()
        matches = sum(1 for word in words if word in t_lower or word in title_lower)
        if matches == 0:
            return 0.0
        
        base_score = 0.30 + (0.50 * (matches / len(words)))
        return min(base_score, 0.90)

    @classmethod
    def search_all(
        cls,
        db: Session,
        query_str: str,
        result_type: str = "ALL",
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Search aggregated sources and return scored, filtered, sorted results.
        """
        query_str = query_str.strip()
        if not query_str:
            return {"items": [], "total": 0}

        results = []
        r_type = result_type.upper()

        # Parse date boundaries
        dt_from = None
        dt_to = None
        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            except ValueError:
                pass
        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            except ValueError:
                pass

        # 1. DATABASE SOURCES SEARCHING (LIKE-based queries wrapped for FTS5 migration safety)
        
        # Source A: Research Notes
        if r_type in ("ALL", "RESEARCH"):
            try:
                q = db.query(Research)
                # Filter by search string
                q = q.filter(
                    (Research.title.contains(query_str)) | 
                    (Research.description.contains(query_str)) |
                    (Research.category.contains(query_str))
                )
                items = q.all()
                for item in items:
                    # Apply date filters
                    item_time = item.created_at
                    if dt_from and item_time < dt_from:
                        continue
                    if dt_to and item_time > dt_to:
                        continue

                    score = cls.calculate_score(query_str, item.description, item.title)
                    results.append({
                        "id": str(item.id),
                        "type": "research",
                        "title": item.title,
                        "description": item.description[:200] + ("..." if len(item.description) > 200 else ""),
                        "url": f"/research?id={item.id}",
                        "timestamp": item.created_at.isoformat(),
                        "score": score,
                        "metadata": {
                            "category": item.category,
                            "tags": item.tags
                        }
                    })
            except Exception as e:
                logger.error(f"Search Service error in Research Note fetcher: {e}")

        # Source B: Datasets
        if r_type in ("ALL", "DATASET"):
            try:
                q = db.query(Dataset)
                q = q.filter(
                    (Dataset.dataset_name.contains(query_str)) |
                    (Dataset.description.contains(query_str)) |
                    (Dataset.category.contains(query_str)) |
                    (Dataset.location.contains(query_str))
                )
                items = q.all()
                for item in items:
                    item_time = item.created_at
                    if dt_from and item_time < dt_from:
                        continue
                    if dt_to and item_time > dt_to:
                        continue

                    score = cls.calculate_score(query_str, item.description, item.dataset_name)
                    results.append({
                        "id": str(item.id),
                        "type": "dataset",
                        "title": item.dataset_name,
                        "description": item.description[:200] + ("..." if len(item.description) > 200 else ""),
                        "url": f"/datasets?id={item.id}",
                        "timestamp": item.created_at.isoformat(),
                        "score": score,
                        "metadata": {
                            "category": item.category,
                            "source": item.source,
                            "location": item.location
                        }
                    })
            except Exception as e:
                logger.error(f"Search Service error in Datasets catalog fetcher: {e}")

        # Source C: Experiments
        if r_type in ("ALL", "EXPERIMENT"):
            try:
                q = db.query(Experiment)
                q = q.filter(
                    (Experiment.title.contains(query_str)) |
                    (Experiment.objective.contains(query_str)) |
                    (Experiment.notes.contains(query_str))
                )
                items = q.all()
                for item in items:
                    item_time = item.created_at
                    if dt_from and item_time < dt_from:
                        continue
                    if dt_to and item_time > dt_to:
                        continue

                    text_pool = f"{item.objective} {item.notes or ''}"
                    score = cls.calculate_score(query_str, text_pool, item.title)
                    results.append({
                        "id": str(item.id),
                        "type": "experiment",
                        "title": item.title,
                        "description": item.objective[:200] + ("..." if len(item.objective) > 200 else ""),
                        "url": f"/experiments?id={item.id}",
                        "timestamp": item.created_at.isoformat(),
                        "score": score,
                        "metadata": {
                            "status": item.status
                        }
                    })
            except Exception as e:
                logger.error(f"Search Service error in Experiments catalog fetcher: {e}")

        # Source D: Logs (ActivityLog)
        if r_type in ("ALL", "LOG"):
            try:
                q = db.query(ActivityLog)
                q = q.filter(
                    (ActivityLog.module.contains(query_str)) |
                    (ActivityLog.action.contains(query_str)) |
                    (ActivityLog.description.contains(query_str))
                )
                items = q.all()
                for item in items:
                    item_time = item.timestamp
                    if dt_from and item_time < dt_from:
                        continue
                    if dt_to and item_time > dt_to:
                        continue

                    score = cls.calculate_score(query_str, item.description, item.action)
                    results.append({
                        "id": str(item.id),
                        "type": "log",
                        "title": f"Log: {item.module} -> {item.action}",
                        "description": item.description,
                        "url": f"/logs?id={item.id}",
                        "timestamp": item.timestamp.isoformat(),
                        "score": score,
                        "metadata": {
                            "severity": item.severity,
                            "module": item.module
                        }
                    })
            except Exception as e:
                logger.error(f"Search Service error in ActivityLogs fetcher: {e}")

        # Source E: Earth Bookmarks
        if r_type in ("ALL", "BOOKMARK"):
            try:
                q = db.query(EarthBookmark)
                q = q.filter(EarthBookmark.name.contains(query_str))
                items = q.all()
                for item in items:
                    item_time = item.created_at
                    if dt_from and item_time < dt_from:
                        continue
                    if dt_to and item_time > dt_to:
                        continue

                    desc = f"Altitude: {item.altitude}m, Coords: ({item.latitude:.4f}, {item.longitude:.4f})"
                    score = cls.calculate_score(query_str, desc, item.name)
                    results.append({
                        "id": str(item.id),
                        "type": "bookmark",
                        "title": f"Bookmark: {item.name}",
                        "description": desc,
                        "url": f"/earth?bookmark={item.id}",
                        "timestamp": item.created_at.isoformat(),
                        "score": score,
                        "metadata": {
                            "latitude": item.latitude,
                            "longitude": item.longitude
                        }
                    })
            except Exception as e:
                logger.error(f"Search Service error in EarthBookmarks fetcher: {e}")

        # Source F: Controlled Settings Shortcuts (Only returned for matched settings keywords)
        if r_type in ("ALL", "SETTING"):
            q_lower = query_str.lower().strip()
            for shortcut in SETTINGS_SHORTCUTS:
                if any(kw in q_lower for kw in shortcut["keywords"]):
                    score = 0.90 if q_lower in shortcut["title"].lower() else 0.75
                    results.append({
                        "id": shortcut["id"],
                        "type": "setting",
                        "title": shortcut["title"],
                        "description": shortcut["description"],
                        "url": shortcut["url"],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "score": score,
                        "metadata": {}
                    })

        # Source G: Documents / Files dynamic scanning in /docs folder (Safe & resilient)
        if r_type in ("ALL", "DOCUMENT", "FILE"):
            if os.path.exists(APPROVED_DOCS_DIR):
                try:
                    scanned_count = 0
                    for filename in os.listdir(APPROVED_DOCS_DIR):
                        if scanned_count >= MAX_FILES_SCANNED:
                            break

                        filepath = os.path.join(APPROVED_DOCS_DIR, filename)
                        if not os.path.isfile(filepath):
                            continue

                        # Check extension
                        _, ext = os.path.splitext(filename)
                        if ext.lower() not in SAFE_EXTENSIONS:
                            continue

                        # Check size
                        if os.path.getsize(filepath) > MAX_FILE_SIZE_BYTES:
                            continue

                        scanned_count += 1
                        
                        # Read content safely
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()

                        # Apply filters
                        if query_str.lower() in filename.lower() or query_str.lower() in content.lower():
                            mtime = os.path.getmtime(filepath)
                            file_time = datetime.fromtimestamp(mtime, tz=timezone.utc)
                            
                            if dt_from and file_time < dt_from:
                                continue
                            if dt_to and file_time > dt_to:
                                continue

                            score = cls.calculate_score(query_str, content[:1000], filename)
                            results.append({
                                "id": filename,
                                "type": "document" if ext.lower() == ".md" else "file",
                                "title": f"Doc: {filename}",
                                "description": content[:200] + ("..." if len(content) > 200 else ""),
                                "url": f"/docs?file={filename}",
                                "timestamp": file_time.isoformat(),
                                "score": score,
                                "metadata": {
                                    "filename": filename,
                                    "size_bytes": os.path.getsize(filepath)
                                }
                            })
                except Exception as e:
                    logger.error(f"Search Service error in dynamic files/docs scanner: {e}")

        # Filter out 0 scores and sort results by score desc, timestamp desc
        valid_results = [r for r in results if r["score"] > 0.0]
        valid_results.sort(key=lambda x: (-x["score"], x["timestamp"]), reverse=False)

        total_count = len(valid_results)
        paginated_items = valid_results[skip : skip + limit]

        return {"items": paginated_items, "total": total_count}
