# API Integration for React Frontend (Render / Vercel Edition)

Your backend is now designed as a standalone Node.js Server powered by a completely free **Firebase Firestore** database.

When running locally, your backend will be at:
`http://localhost:5001`

When you deploy your application to a free host like Render, Vercel, or Heroku, they will provide a specific live URL (e.g. `https://my-backend.onrender.com`). Be sure to swap the `BASE_URL` below!

### 1. Fetching All Devices

If you want to pull the entire list, or apply some query params (e.g. searching):

```javascript
const BASE_URL = "http://localhost:5001"; // CHANGE ME ONCE DEPLOYED!

// Example: Fetching all devices
const fetchAllDevices = async () => {
  try {
    const response = await fetch(`${BASE_URL}/devices`);
    const data = await response.json();
    console.log("All devices:", data);
    return data;
  } catch (error) {
    console.error("Error fetching all devices:", error);
  }
};

// Example: Fetching devices with query parameters
// Note: Firestore text queries are strict equality matches (not loose LIKE searches)
const fetchDevicesByQuery = async () => {
  try {
    // Optional filters: brand, os, ram, limit, offset
    const response = await fetch(`${BASE_URL}/devices?brand=samsung&limit=20`);
    const data = await response.json();
    console.log("Samsung devices (max 20):", data);
    return data;
  } catch (error) {
    console.error("Error fetching query devices:", error);
  }
};
```

### 2. Fetching a Single Device By ID

When a user clicks on a single device to view its detailed page:

```javascript
const fetchSingleDevice = async (deviceId) => {
  try {
    const response = await fetch(`${BASE_URL}/devices/${deviceId}`);

    if (!response.ok) {
      if (response.status === 404) throw new Error("Device not found");
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    console.log("Single device data:", data);
    return data;
  } catch (error) {
    console.error(`Error fetching device ID ${deviceId}:`, error);
  }
};
```

### 3. Fetching Multiple Devices for Comparison

When users load the Compare page, pass a comma-separated string of IDs to fetch up to 5 devices in one optimal database query:

```javascript
const fetchComparisonDevices = async (deviceIdsArray) => {
  try {
    // Example: deviceIdsArray = [4, 12, 18] -> "4,12,18"
    const idsString = deviceIdsArray.join(",");

    const response = await fetch(`${BASE_URL}/compare?ids=${idsString}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Network response was not ok");
    }

    const data = await response.json();
    console.log("Devices for comparison:", data.devices);
    console.log("Comparison Verdict:", data.verdict);
    return data; // { devices: [device objects], verdict: "string explanation" }
  } catch (error) {
    console.error("Error fetching comparison devices:", error);
  }
};
```

### Handling Nested Specs

Firestore correctly maintains the nested JSON structure. In your React component, you can render specs like this:

```jsx
<div>
  <h2>
    {device.brand} {device.model}
  </h2>
  <p>Display Size: {device.specs?.Display?.Size || "N/A"}</p>
  <p>OS: {device.specs?.Platform?.OS || "N/A"}</p>
  <p>Battery: {device.specs?.Battery?.Type || "N/A"}</p>
</div>
```
