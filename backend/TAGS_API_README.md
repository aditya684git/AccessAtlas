# Accessibility Tags API Documentation

## Overview
RESTful API for storing and retrieving accessibility tags with persistent SQLite storage. Tags can come from three sources: user-generated, OpenStreetMap (OSM), or ML model detection.

## Architecture

### Database Schema
```
AccessibilityTag:
  - id (Primary Key)
  - location_name (String, indexed)
  - lat, lon (Float - coordinates)
  - tag_type (Enum: Ramp, Elevator, Entrance, Tactile Path, Obstacle, Parking, Restroom)
  - source (Enum: user, osm, model - indexed)
  - address (Optional String)
  - confidence (Optional Float 0-1, model only)
  - osm_id (Optional String, OSM only)
  - notes (Optional String)
  - created_at, updated_at (Timestamps)
```

### Technology Stack
- **FastAPI**: Web framework with automatic OpenAPI docs
- **SQLAlchemy 2.0**: ORM for database operations
- **SQLite**: Default database (easily swappable for PostgreSQL/MongoDB)
- **Pydantic**: Request/response validation
- **Python 3.10+**: Required

## API Endpoints

### 1. Store Tags
**POST** `/api/tags/store`

Store multiple accessibility tags for a location.

**Request Body:**
```json
{
  "location_name": "Clemson University",
  "lat": 34.6834,
  "lon": -82.8374,
  "tags": [
    {
      "type": "Ramp",
      "lat": 34.6835,
      "lon": -82.8375,
      "source": "user",
      "address": "Cooper Library - Main Entrance",
      "notes": "Wide ramp with handrails"
    },
    {
      "type": "Elevator",
      "lat": 34.6840,
      "lon": -82.8380,
      "source": "osm",
      "osm_id": "node/123456",
      "address": "Brackett Hall"
    },
    {
      "type": "Entrance",
      "lat": 34.6845,
      "lon": -82.8385,
      "source": "model",
      "confidence": 0.92,
      "address": "Student Union"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully stored 3 tags",
  "location_name": "Clemson University",
  "tags_stored": 3,
  "tag_ids": [1, 2, 3]
}
```

**Validation Rules:**
- `confidence` can only be set for `source: "model"`
- `osm_id` can only be set for `source: "osm"`
- `lat` must be between -90 and 90
- `lon` must be between -180 and 180
- At least one tag required

---

### 2. Get Tags by Location
**GET** `/api/tags/location/{location_name}`

Retrieve all tags for a location, grouped by source.

**Path Parameters:**
- `location_name` (string): Name of the location

**Query Parameters (Optional):**
- `radius_km` (float): Search radius in kilometers
- `lat` (float): Center latitude for proximity search
- `lon` (float): Center longitude for proximity search

**Example:**
```bash
GET /api/tags/location/Clemson%20University
GET /api/tags/location/Clemson%20University?radius_km=2&lat=34.6834&lon=-82.8374
```

**Response (200 OK):**
```json
{
  "location_name": "Clemson University",
  "lat": 34.6834,
  "lon": -82.8374,
  "total_tags": 3,
  "tags": {
    "user": [
      {
        "id": 1,
        "type": "Ramp",
        "lat": 34.6835,
        "lon": -82.8375,
        "source": "user",
        "address": "Cooper Library",
        "notes": "Wide ramp with handrails",
        "created_at": "2025-11-27T10:00:00Z",
        "updated_at": null,
        "confidence": null,
        "osm_id": null
      }
    ],
    "osm": [
      {
        "id": 2,
        "type": "Elevator",
        "lat": 34.6840,
        "lon": -82.8380,
        "source": "osm",
        "osm_id": "node/123456",
        "address": "Brackett Hall",
        "created_at": "2025-11-27T10:05:00Z",
        "updated_at": null,
        "confidence": null,
        "notes": null
      }
    ],
    "model": [
      {
        "id": 3,
        "type": "Entrance",
        "lat": 34.6845,
        "lon": -82.8385,
        "source": "model",
        "confidence": 0.92,
        "address": "Student Union",
        "created_at": "2025-11-27T10:10:00Z",
        "updated_at": null,
        "osm_id": null,
        "notes": null
      }
    ]
  }
}
```

---

### 3. List All Locations
**GET** `/api/tags/locations`

Get all unique locations with tag counts.

**Response (200 OK):**
```json
[
  {
    "location_name": "Clemson University",
    "lat": 34.6834,
    "lon": -82.8374,
    "tag_count": 15
  },
  {
    "location_name": "Downtown Greenville",
    "lat": 34.8526,
    "lon": -82.3940,
    "tag_count": 8
  }
]
```

---

### 4. Delete Tag
**DELETE** `/api/tags/tag/{tag_id}`

Delete a specific tag by ID.

**Path Parameters:**
- `tag_id` (integer): ID of the tag to delete

**Response (204 No Content):**
Empty body on success.

**Response (404 Not Found):**
```json
{
  "detail": "Tag with ID 999 not found"
}
```

---

### 5. Get Statistics
**GET** `/api/tags/statistics`

Get overall statistics about all tags.

**Response (200 OK):**
```json
{
  "total_tags": 50,
  "by_source": {
    "user": 20,
    "osm": 25,
    "model": 5
  },
  "by_type": {
    "Ramp": 15,
    "Elevator": 10,
    "Entrance": 12,
    "Tactile Path": 8,
    "Obstacle": 3,
    "Parking": 2
  }
}
```

---

## Installation

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Server
```bash
uvicorn main:app --reload --port 8000
```

The database will be automatically created at `backend/accessibility_tags.db`.

---

## Testing

### Run Test Suite
```bash
python test_tags_api.py
```

### Manual Testing with cURL

**Store Tags:**
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

**Get Tags:**
```bash
curl http://localhost:8000/api/tags/location/Clemson%20University
```

**Get Statistics:**
```bash
curl http://localhost:8000/api/tags/statistics
```

---

## Interactive API Documentation

FastAPI automatically generates interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

You can test all endpoints directly in the browser!

---

## Database Migration (SQLite → PostgreSQL)

To switch from SQLite to PostgreSQL:

1. **Install PostgreSQL driver:**
   ```bash
   pip install psycopg2-binary
   ```

2. **Update `database.py`:**
   ```python
   DATABASE_URL = "postgresql://user:password@localhost/accessatlas"
   ```

3. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

No code changes needed - SQLAlchemy handles the abstraction!

---

## Database Migration (SQLite → MongoDB)

To switch to MongoDB:

1. **Install MongoDB driver:**
   ```bash
   pip install motor odmantic
   ```

2. **Replace SQLAlchemy with Odmantic:**
   - Update `models.py` to use Odmantic models
   - Update `crud.py` to use Motor async operations
   - Update `database.py` with MongoDB connection

---

## Error Handling

All endpoints return standard HTTP error codes:

- **200 OK**: Success
- **201 Created**: Resource created
- **204 No Content**: Deleted successfully
- **400 Bad Request**: Invalid request data
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error

**Error Response Format:**
```json
{
  "detail": "Error message here"
}
```

---

## Logging

All operations are logged with timestamps:

```
2025-11-27 10:00:00 - crud - INFO - Created 3 tags for location: Clemson University
2025-11-27 10:00:05 - crud - INFO - Retrieved 15 tags for location: Clemson University
2025-11-27 10:00:10 - tags_api - ERROR - Error storing tags: Invalid coordinates
```

Logs include:
- Tag creation/retrieval operations
- Database errors
- Validation failures
- Performance metrics

---

## Security Considerations

### Current Implementation
- No authentication (for development)
- CORS enabled for localhost origins
- Input validation via Pydantic
- SQL injection protected by SQLAlchemy ORM

### Production Recommendations
1. **Add Authentication**: JWT tokens, OAuth2
2. **Rate Limiting**: Prevent abuse
3. **HTTPS Only**: Encrypt data in transit
4. **Database Backups**: Regular automated backups
5. **Input Sanitization**: Additional XSS protection
6. **API Keys**: Rate limit by key

---

## Performance Optimization

### Indexing
Database indexes on:
- `location_name` (for fast lookups)
- `source` (for grouped queries)
- `id` (primary key)

### Query Optimization
- Uses SQLAlchemy `refresh()` to minimize database hits
- Batch inserts for multiple tags
- Efficient grouping via Python dict comprehension

### Caching (Future)
Consider adding Redis for:
- Frequently accessed locations
- Statistics cache
- Rate limiting

---

## Future Enhancements

1. **Spatial Queries**: PostGIS for accurate distance calculations
2. **Tag Updates**: PATCH endpoint for editing tags
3. **User Authentication**: Associate tags with users
4. **Tag Verification**: Community voting system
5. **Photo Attachments**: Store images with tags
6. **Batch Operations**: Bulk import/export
7. **Search**: Full-text search on addresses/notes
8. **Analytics**: Heatmaps, trend analysis

---

## File Structure

```
backend/
├── main.py              # FastAPI app with all endpoints
├── database.py          # Database connection & session management
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic request/response schemas
├── crud.py              # Database CRUD operations
├── tags_api.py          # Tags API router
├── test_tags_api.py     # API test suite
├── requirements.txt     # Python dependencies
└── accessibility_tags.db  # SQLite database (auto-created)
```

---

## Support

For issues or questions:
1. Check the interactive docs at `/docs`
2. Review logs for error details
3. Run test suite to verify setup
4. Check database file exists and has permissions

---

## License

MIT License - See LICENSE file for details
