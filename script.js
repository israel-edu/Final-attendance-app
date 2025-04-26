// Constants
let SPECIAL_CODE = localStorage.getItem("specialCode") || "Israel"; // Default code is "Israel"

// Helper Function to Get Query Parameters
function getQueryParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Admin Dashboard Functionality
function setupAdminDashboard() {
  // Save workspace location, vertical tolerance, and radius
  document.getElementById('saveWorkspaceBtn')?.addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('workspaceLat').value);
    const lng = parseFloat(document.getElementById('workspaceLng').value);
    const verticalTolerance = parseFloat(document.getElementById('workspaceVerticalTolerance').value);
    const radius = parseFloat(document.getElementById('workspaceRadius').value);

    if (!lat || !lng || !radius || isNaN(verticalTolerance)) {
      alert("Please enter valid latitude, longitude, vertical tolerance, and radius.");
      return;
    }

    // Save workspace data to localStorage
    localStorage.setItem("workspace", JSON.stringify({ lat, lng, verticalTolerance, radius }));
    alert("Workspace location, vertical tolerance, and radius saved successfully!");
  });

  // Auto Set Location Button
  document.getElementById('autoSetLocationBtn')?.addEventListener('click', async () => {
    try {
      const position = await getLocation();
      document.getElementById('workspaceLat').value = position.latitude.toFixed(5);
      document.getElementById('workspaceLng').value = position.longitude.toFixed(5);
      alert("Your device's location has been auto-set.");
    } catch (err) {
      alert(err.message || "Unable to retrieve your location.");
    }
  });

  // Set Admin Code (Optional)
  document.getElementById('changeCodeBtn')?.addEventListener('click', () => {
    const newCode = document.getElementById('newCodeInput').value.trim();

    if (newCode) {
      // Update the special code only if a new one is provided
      SPECIAL_CODE = newCode;
      localStorage.setItem("specialCode", newCode); // Save the new code to localStorage
      alert("Admin code updated successfully!");
    } else {
      alert("No new admin code provided. The current code remains unchanged.");
    }
  });

  // Generate Check-In Link
  document.getElementById('generateLinkBtn')?.addEventListener('click', () => {
    const currentCode = localStorage.getItem("specialCode") || "Israel";
    const link = `${window.location.origin}/index.html?code=${encodeURIComponent(currentCode)}`;
    document.getElementById('shareableLink').textContent = `Share this link: ${link}`;
  });

  // View check-in history
  document.getElementById('viewHistoryBtn')?.addEventListener('click', () => {
    const code = prompt("Enter admin code to view check-ins:");

    if (code !== SPECIAL_CODE) {
      alert("Access denied. Incorrect code.");
      return;
    }

    const history = loadHistory();
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
  });

  // Clear check-in history
  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    const code = prompt("Enter admin code to clear check-ins:");

    if (code !== SPECIAL_CODE) {
      alert("Access denied. Incorrect code.");
      return;
    }

    clearHistory();
    document.getElementById('historyList').innerHTML = "<li>History cleared.</li>";
  });
}

// User Check-In Functionality
function setupUserCheckIn() {
  // Extract the special code from the query string
  const codeFromURL = getQueryParameter("code");
  if (codeFromURL) {
    document.getElementById('codeInput').value = decodeURIComponent(codeFromURL);
  }

  document.getElementById('checkInBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value.trim();
    const code = document.getElementById('codeInput').value.trim();

    if (!name || !code) {
      alert("Please enter both name and code.");
      return;
    }

    // Validate the code (match against the one in the query string)
    const expectedCode = getQueryParameter("code");
    if (code !== expectedCode) {
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

      // Load workspace settings
      const workspace = loadWorkspace();
      if (!workspace) {
        alert("Workspace location not set by admin.");
        return;
      }

      // Calculate horizontal distance
      const horizontalDistance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        workspace.lat,
        workspace.lng
      );

      // Check vertical tolerance
      const verticalTolerance = workspace.verticalTolerance;
      const verticalDistance = Math.abs(userLocation.altitude - (position.altitude || 0));

      if (horizontalDistance <= workspace.radius && verticalDistance <= verticalTolerance) {
        // Successful check-in
        saveCheckIn(name, userLocation);
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

// Function to save check-in data
function saveCheckIn(name, location) {
  const history = JSON.parse(localStorage.getItem("checkInHistory") || "[]");
  history.unshift({
    name,
    time: new Date().toISOString(),
    latitude: location.lat.toFixed(5),
    longitude: location.lng.toFixed(5),
    altitude: location.altitude.toFixed(2)
  });
  localStorage.setItem("checkInHistory", JSON.stringify(history));
}

// Function to load workspace settings
function loadWorkspace() {
  return JSON.parse(localStorage.getItem("workspace")) || null;
}

// Function to load check-in history
function loadHistory() {
  return JSON.parse(localStorage.getItem("checkInHistory") || "[]");
}

// Function to clear check-in history
function clearHistory() {
  localStorage.removeItem("checkInHistory");
}

// Determine which page is loaded and initialize the appropriate functionality
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('saveWorkspaceBtn')) {
    // Admin Dashboard Page
    setupAdminDashboard();
  } else if (document.getElementById('checkInBtn')) {
    // User Check-In Page
    setupUserCheckIn();
  }
});
