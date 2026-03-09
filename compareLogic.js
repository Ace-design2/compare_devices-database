/**
 * compareLogic.js
 * Analyzes an array of device objects and determines the best based on their specs.
 */

// Helper to extract numbers using RegEx
const extractNumber = (text, regex) => {
    if (!text) return 0;
    const match = text.match(regex);
    return match && match[1] ? parseFloat(match[1]) : 0;
};

// Extracts key metrics from a device's specs
const parseDeviceStats = (device) => {
    const specs = device.specs || {};
    
    // Fallback deep access
    const getSpecStr = (cat, key) => (specs[cat] && specs[cat][key]) ? specs[cat][key] : '';

    const batteryStr = getSpecStr('Battery', 'Type');
    const memoryStr = getSpecStr('Memory', 'Internal');
    // Main camera varies, might be 'Single', 'Dual', 'Triple', 'Quad'
    const mainCameraKeys = ['Single', 'Dual', 'Triple', 'Quad', 'Penta'];
    let cameraStr = '';
    for (const k of mainCameraKeys) {
        if (specs['Main Camera'] && specs['Main Camera'][k]) {
            cameraStr = specs['Main Camera'][k];
            break;
        }
    }
    
    // Parse values
    const batteryCapacity = extractNumber(batteryStr, /(\d{3,5})\s*mAh/i);
    const ram = extractNumber(memoryStr, /(\d{1,2})\s*GB\s*RAM/i) || extractNumber(memoryStr, /(\d{1,2})\s*GB/i); // Sometimes RAM isn't explicitly labelled "RAM" but it's secondary
    const storage = extractNumber(memoryStr, /^(\d{2,4})\s*GB/i) || extractNumber(memoryStr, /(\d{1,3})\s*TB/i) * 1024; // Convert TB to GB
    const cameraMP = extractNumber(cameraStr, /(\d+)\s*MP/i);

    return {
        id: device.id,
        name: `${device.brand.toUpperCase()} ${device.model}`,
        battery: batteryCapacity,
        ram: ram,
        storage: storage,
        cameraMP: cameraMP,
        score: 0
    };
};

const generateVerdict = (devices) => {
    if (!devices || devices.length < 2) {
        return "Not enough devices to compare. Please select at least two.";
    }

    const statsArray = devices.map(parseDeviceStats);

    // Find maximums for comparison
    const maxBattery = Math.max(...statsArray.map(d => d.battery));
    const maxRam = Math.max(...statsArray.map(d => d.ram));
    const maxStorage = Math.max(...statsArray.map(d => d.storage));
    const maxCamera = Math.max(...statsArray.map(d => d.cameraMP));

    // Simple Scoring mechanism
    statsArray.forEach(d => {
        if (d.battery === maxBattery && maxBattery > 0) d.score += 1;
        if (d.ram === maxRam && maxRam > 0) d.score += 1.5; // Weight RAM a bit more
        if (d.storage === maxStorage && maxStorage > 0) d.score += 1;
        if (d.cameraMP === maxCamera && maxCamera > 0) d.score += 1;
    });

    // Sort by score
    statsArray.sort((a, b) => b.score - a.score);

    const winner = statsArray[0];
    const runnerUp = statsArray[1];

    if (winner.score === 0) {
        return "It's difficult to determine a clear winner as the specifications lack detailed metric data.";
    }

    if (winner.score === runnerUp.score) {
        return `It's a tie between the ${winner.name} and the ${runnerUp.name}. Both offer highly competitive specifications, making either a solid choice depending on your exact aesthetic preferences.`;
    }

    // Build the explanation text
    let explanation = `The **${winner.name}** is the overall better device based on raw specifications. `;
    const reasons = [];

    if (winner.battery === maxBattery && maxBattery > 0) {
        reasons.push(`a massive ${winner.battery}mAh battery for longer life`);
    }
    if (winner.ram === maxRam && maxRam > 0) {
        reasons.push(`superior multitasking with ${winner.ram}GB of RAM`);
    }
    if (winner.storage === maxStorage && maxStorage > 0) {
        reasons.push(`plenty of storage (${winner.storage}GB)`);
    }
    if (winner.cameraMP === maxCamera && maxCamera > 0) {
        reasons.push(`a higher resolution ${winner.cameraMP}MP main camera`);
    }

    if (reasons.length > 0) {
        if (reasons.length === 1) {
            explanation += `It stands out primarily because of ${reasons[0]}.`;
        } else {
            const lastReason = reasons.pop();
            explanation += `It wins thanks to ${reasons.join(', ')}, and ${lastReason}.`;
        }
    } else {
        explanation += "It provides a highly balanced performance across all core metrics.";
    }

    return explanation;
};

module.exports = { generateVerdict };
