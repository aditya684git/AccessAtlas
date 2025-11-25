// Copy and paste this entire script into the browser console at http://localhost:8080

const modelPredictions = [
  {
    "id": "model-0",
    "type": "Entrance",
    "lat": 34.684492,
    "lon": -82.430698,
    "source": "model",
    "confidence": 0.648,
    "timestamp": null,
    "image_path": "VizWiz_train_000000007035.jpg",
    "address": "Owens Road, Greenville County, South Carolina"
  },
  {
    "id": "model-1",
    "type": "Entrance",
    "lat": 34.622028,
    "lon": -82.509278,
    "source": "model",
    "confidence": 0.636,
    "timestamp": null,
    "image_path": "VizWiz_test_000000021935.jpg",
    "address": "Beaver Run Lane, Anderson County, South Carolina"
  },
  {
    "id": "model-2",
    "type": "Obstacle",
    "lat": 34.702997,
    "lon": -82.438497,
    "source": "model",
    "confidence": 0.524,
    "timestamp": null,
    "image_path": "VizWiz_test_000000022162.jpg",
    "address": "1152, Old Pelzer Road, Kingswood"
  },
  {
    "id": "model-3",
    "type": "Ramp",
    "lat": 34.712049,
    "lon": -82.45913,
    "source": "model",
    "confidence": 0.742,
    "timestamp": null,
    "image_path": "VizWiz_train_000000005774.jpg",
    "address": "Orr Street, Piedmont, Greenville County"
  },
  {
    "id": "model-4",
    "type": "Obstacle",
    "lat": 34.683583,
    "lon": -82.459502,
    "source": "model",
    "confidence": 0.816,
    "timestamp": null,
    "image_path": "VizWiz_test_000000026238.jpg",
    "address": "Dyer Lane, Piedmont, Greenville County"
  },
  {
    "id": "model-5",
    "type": "Obstacle",
    "lat": 34.622229,
    "lon": -82.444184,
    "source": "model",
    "confidence": 0.771,
    "timestamp": null,
    "image_path": "VizWiz_train_000000007263.jpg",
    "address": "Lee Avenue, Greenville County, South Carolina"
  },
  {
    "id": "model-6",
    "type": "Ramp",
    "lat": 34.648528,
    "lon": -82.479464,
    "source": "model",
    "confidence": 0.762,
    "timestamp": null,
    "image_path": "VizWiz_val_000000028916.jpg",
    "address": "97, Stephanie Drive, West Pelzer"
  },
  {
    "id": "model-7",
    "type": "Ramp",
    "lat": 34.696764,
    "lon": -82.434633,
    "source": "model",
    "confidence": 0.629,
    "timestamp": null,
    "image_path": "VizWiz_val_000000028861.jpg",
    "address": "Daytona Lane, Piedmont Estates, Greenville County"
  },
  {
    "id": "model-8",
    "type": "Obstacle",
    "lat": 34.712351,
    "lon": -82.430287,
    "source": "model",
    "confidence": 0.62,
    "timestamp": null,
    "image_path": "VizWiz_test_000000027397.jpg",
    "address": "Emily Lane, Greenville County, South Carolina"
  },
  {
    "id": "model-9",
    "type": "Ramp",
    "lat": 34.641687,
    "lon": -82.436237,
    "source": "model",
    "confidence": 0.579,
    "timestamp": null,
    "image_path": "VizWiz_train_000000019219.jpg",
    "address": "124, Eastview Road, East View"
  },
  {
    "id": "model-10",
    "type": "Obstacle",
    "lat": 34.625433,
    "lon": -82.499996,
    "source": "model",
    "confidence": 0.69,
    "timestamp": null,
    "image_path": "VizWiz_test_000000027949.jpg",
    "address": "P Williams Road, Anderson County, South Carolina"
  },
  {
    "id": "model-11",
    "type": "Obstacle",
    "lat": 34.705617,
    "lon": -82.487914,
    "source": "model",
    "confidence": 0.615,
    "timestamp": null,
    "image_path": "VizWiz_train_000000004465.jpg",
    "address": "1557, Highway 86, Piedmont"
  }
];

const osmTags = [
  {
    "id": "osm-4057393952",
    "type": "Entrance",
    "lat": 34.642877,
    "lon": -82.437252,
    "source": "osm",
    "osmId": 4057393952,
    "timestamp": null,
    "readonly": true,
    "address": "Eastview Baptist Church, 120, Eastview Road"
  }
];

// Combine and add timestamps
const allTags = [...modelPredictions, ...osmTags].map(tag => ({
  ...tag,
  timestamp: new Date().toISOString()
}));

// Save to localStorage
localStorage.setItem('accessibility_tags', JSON.stringify(allTags));

console.log(`✅ Imported ${allTags.length} tags!`);
console.log(`   - Model predictions: ${modelPredictions.length}`);
console.log(`   - OSM features: ${osmTags.length}`);
console.log('\n🔄 Reloading page to display tags...');

// Reload the page to show the tags
setTimeout(() => location.reload(), 1000);
