// Constants (Hardcoded Values)
const SPECIAL_CODE = "Israel"; // Hardcoded special code
const WORKSPACE = {
  lat: 37.7749, // Example latitude (San Francisco)
  lng: -122.4194, // Example longitude (San Francisco)
  radius: 300, // Workspace radius in meters
  verticalTolerance: 50 // Vertical tolerance in meters
};

// GitHub Gist Configuration
const GIST_ID = "YOUR_GIST_ID"; // Replace with your Gist ID
const GITHUB_TOKEN = "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"; // Your GitHub Personal Access Token

// Helper Function to Get Query Parameters
function getQueryParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Admin Dashboard Functionality
function setupAdminDashboard() {
  // View check-in history
  document.getElementById('viewHistoryBtn')?.addEventListener('click', async () => {
    const code = prompt("Enter admin code to view check-ins:");

    if (code !== SPECIAL_CODE) {
      alert("Access denied. Incorrect code.");
      return;
    }

    try {
      const history = await loadHistory();
      const historyList = document.getElementById('historyList');
      historyList.innerHTML = "";

      if (history.length === 0) {
        historyList.innerHTML = "<li>No check-ins found.</li>";
        return;
      }

      history.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - ${item.time} [Lat: ${item.latitude}, Lng: ${item.longitude}, Alt: ${item.altitude}]`;
        historyList.appendChild(li);
      });
    } catch (err) {
      console.error("Error loading check-in history:", err);
      alert("Failed to load check-in history.");
    }
  });

  // Clear check-in history
  document.getElementById('clearHistoryBtn')?.addEventListener('click', async () => {
    const code = prompt("Enter admin code to clear check-ins:");

    if (code !== SPECIAL_CODE) {
      alert("Access denied. Incorrect code.");
      return;
    }

    try {
      await clearHistory();
      document.getElementById('historyList').innerHTML = "<li>History cleared.</li>";
    } catch (err) {
      console.error("Error clearing check-in history:", err);
      alert("Failed to clear check-in history.");
    }
  });
}

// User Check-In Functionality
function setupUserCheckIn() {
  document.getElementById('checkInBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value.trim();
    const code = document.getElementById('codeInput').value.trim();

    if (!name || !code) {
      alert("Please enter both name and code.");
      return;
    }

    // Validate the code (match against the hardcoded value)
    if (code !== SPECIAL_CODE) {
      alert("Access denied. Incorrect code.");
      return;
    }

    try {
      // Get user's location
      const position = await getLocation();
      const userLocation = { 
        lat: position.latitude, 
        lng: position.longitude, 
        altitude: position.altitude 
      };

      // Calculate horizontal distance
      const horizontalDistance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        WORKSPACE.lat,
        WORKSPACE.lng
      );

      // Check vertical tolerance
      const verticalDistance = Math.abs(userLocation.altitude - (position.altitude || 0));

      if (horizontalDistance <= WORKSPACE.radius && verticalDistance <= WORKSPACE.verticalTolerance) {
        // Successful check-in
        await saveCheckIn(name, userLocation);
        alert(`Check-in successful! Welcome, ${name}.`);
      } else {
        // Failed check-in
        alert("Check-in failed. You are outside the allowed range.");
      }
    } catch (err) {
      alert(err.message || "An error occurred. Please try again.");
    }
  });
}

// Shared Functions

// Function to calculate horizontal distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Function to get user's location using Geolocation API
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation is not supported by your browser.");
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude || 0 // Default to 0 if altitude is unavailable
        }),
        () => reject("Unable to retrieve your location.")
      );
    }
  });
}

// Function to save check-in data to GitHub Gist
async function saveCheckIn(name, location) {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "GET",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Gist data.");
    }

    const gistData = await response.json();
    const checkIns = JSON.parse(gistData.files["checkIns.json"].content).checkIns;

    // Add the new check-in
    checkIns.unshift({
      name,
      time: new Date().toISOString(),
      latitude: location.lat.toFixed(5),
      longitude: location.lng.toFixed(5),
      altitude: location.altitude.toFixed(2)
    });

    // Update the Gist
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: {
          "checkIns.json": {
            content: JSON.stringify({ checkIns }, null, 2)
          }
        }
      })
    });
  } catch (err) {
    console.error("Error saving check-in:", err);
    alert("Failed to save check-in. Please try again.");
  }
}

// Function to load check-in history from GitHub Gist
async function loadHistory() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "GET",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Gist data.");
    }

    const gistData = await response.json();
    const checkIns = JSON.parse(gistData.files["checkIns.json"].content).checkIns;
    return checkIns || [];
  } catch (err) {
    console.error("Error loading check-in history:", err);
    alert("Failed to load check-in history.");
    return [];
  }
}

// Function to clear check-in history
async function clearHistory() {
  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: {
          "checkIns.json": {
            content: JSON.stringify({ checkIns: [] }, null, 2)
          }
        }
      })
    });
  } catch (err) {
    console.error("Error clearing check-in history:", err);
    alert("Failed to clear check-in history.");
  }
}

// Determine which page is loaded and initialize the appropriate functionality
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('viewHistoryBtn')) {
    // Admin Dashboard Page
    setupAdminDashboard();
  } else if (document.getElementById('checkInBtn')) {
    // User Check-In Page
    setupUserCheckIn();
  }
});
