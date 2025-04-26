// Admin Dashboard Functionality
function setupAdminDashboard() {
  // Save workspace location, vertical tolerance, and radius
  document.getElementById('saveWorkspaceBtn')?.addEventListener('click', async () => {
    const lat = parseFloat(document.getElementById('workspaceLat').value);
    const lng = parseFloat(document.getElementById('workspaceLng').value);
    const verticalTolerance = parseFloat(document.getElementById('workspaceVerticalTolerance').value);
    const radius = parseFloat(document.getElementById('workspaceRadius').value);

    if (!lat || !lng || !radius || isNaN(verticalTolerance)) {
      alert("Please enter valid latitude, longitude, vertical tolerance, and radius.");
      return;
    }

    try {
      await saveWorkspaceSettings({ lat, lng, verticalTolerance, radius });
      alert("Workspace settings saved successfully!");
    } catch (err) {
      console.error("Error saving workspace settings:", err);
      alert("Failed to save workspace settings. Please try again.");
    }
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

  // Load workspace settings on page load
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const workspace = await loadWorkspaceSettings();
      if (workspace) {
        document.getElementById('workspaceLat').value = workspace.lat.toFixed(5);
        document.getElementById('workspaceLng').value = workspace.lng.toFixed(5);
        document.getElementById('workspaceVerticalTolerance').value = workspace.verticalTolerance;
        document.getElementById('workspaceRadius').value = workspace.radius;
      }
    } catch (err) {
      console.error("Error loading workspace settings:", err);
    }
  });

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

// Shared Functions

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
