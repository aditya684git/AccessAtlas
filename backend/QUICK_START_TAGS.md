# Quick Start: Tags Storage API

## ✅ What's New
Your AccessAtlas backend now includes **persistent tag storage** with SQLite! Tags from users, OSM, and ML models are automatically saved to a database.

## 🚀 Getting Started

### 1. Install New Dependencies
```bash
cd backend
pip install sqlalchemy==2.0.36 alembic==1.13.0 requests
```

### 2. Start Backend Server
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

The database `accessibility_tags.db` will be created automatically.

### 3. Test the API
```bash
python test_tags_api.py
```

Expected output: **5/5 tests passed ✓**

---

## 📌 API Endpoints

### Store Tags
```bash
curl -X POST http://localhost:8000/api/tags/store \
  -H "Content-Type: application/json" \
  -d '{
    "location_name": "Clemson University",
    "lat": 34.6834,
    "lon": -82.8374,
    "tags": [
      {
        "type": "Ramp",
        "lat": 34.6835,
        "lon": -82.8375,
        "source": "user",
        "address": "Cooper Library"
      }
    ]
  }'
```

### Get Tags
```bash
curl http://localhost:8000/api/tags/location/Clemson%20University
```

Response groups tags by source:
```json
{
  "location_name": "Clemson University",
  "total_tags": 8,
  "tags": {
    "user": [...],
    "osm": [...],
    "model": [...]
  }
}
```

---

## 🎯 Interactive Docs

Open in browser: **http://localhost:8000/docs**

Try all endpoints with live examples!

---

## 📁 New Files Created

```
backend/
├── database.py          ← Database connection & session
├── models.py            ← SQLAlchemy ORM models
├── schemas.py           ← Pydantic validation schemas
├── crud.py              ← Database operations
├── tags_api.py          ← FastAPI routes
├── test_tags_api.py     ← Test suite
├── TAGS_API_README.md   ← Full documentation
└── accessibility_tags.db ← SQLite database (auto-created)
```

---

## 🔧 Integration with Frontend

Your Generate Tags button should now **save tags to the database**!

### Example: Save OSM tags
```typescript
// After fetching OSM tags
const response = await fetch('http://localhost:8000/api/tags/store', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location_name: 'Clemson University',
    lat: 34.6834,
    lon: -82.8374,
    tags: osmTags.map(tag => ({
      type: tag.type,
      lat: tag.lat,
      lon: tag.lon,
      source: 'osm',
      osm_id: tag.osmId,
      address: tag.address
    }))
  })
});
```

### Example: Load saved tags
```typescript
const response = await fetch(
  `http://localhost:8000/api/tags/location/${encodeURIComponent(locationName)}`
);
const data = await response.json();

// data.tags.user = user-generated tags
// data.tags.osm = OSM tags
// data.tags.model = ML-detected tags
```

---

## 🔍 Database Schema

```sql
CREATE TABLE accessibility_tags (
  id INTEGER PRIMARY KEY,
  location_name VARCHAR NOT NULL,
  lat FLOAT NOT NULL,
  lon FLOAT NOT NULL,
  tag_type ENUM('Ramp', 'Elevator', 'Entrance', ...) NOT NULL,
  source ENUM('user', 'osm', 'model') NOT NULL,
  address VARCHAR,
  confidence FLOAT,        -- For model tags only
  osm_id VARCHAR,          -- For OSM tags only
  notes VARCHAR,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);
```

---

## 📊 Features

✅ **Persistent Storage** - Tags survive server restarts  
✅ **Multi-Source Support** - User, OSM, and Model tags  
✅ **Grouped Responses** - Tags organized by source  
✅ **Validation** - Pydantic schemas prevent invalid data  
✅ **Statistics** - Track tag counts by type and source  
✅ **Proximity Search** - Find tags within radius  
✅ **Easy Migration** - Swap SQLite for PostgreSQL/MongoDB  

---

## 🎓 Next Steps

1. **Update Frontend** - Integrate POST /api/tags/store after tag generation
2. **Add Loading UI** - Show "Saving tags..." message
3. **Show Saved Tags** - Load tags from database on map initialization
4. **User Profiles** - Add authentication to track who created tags
5. **Tag Editing** - Add UPDATE endpoint for modifying tags

---

## 🐛 Troubleshooting

**Server won't start?**
```bash
# Check SQLAlchemy version (needs 2.0.36 for Python 3.13)
pip install sqlalchemy==2.0.36 --upgrade
```

**Database locked?**
```bash
# Close all connections and restart server
```

**Tests failing?**
```bash
# Make sure server is running first
python -m uvicorn main:app --reload --port 8000
# Then run tests in another terminal
python test_tags_api.py
```

---

## 📚 Full Documentation

See **TAGS_API_README.md** for:
- Complete API reference
- All validation rules
- Database migration guides
- Production deployment tips
- Security best practices

---

## 🎉 You're Ready!

Your backend now has enterprise-grade tag storage. All tags are automatically saved and can be retrieved anytime!

**Test it:** http://localhost:8000/docs
