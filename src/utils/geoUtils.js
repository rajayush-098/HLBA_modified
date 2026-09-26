// Major Indian districts coordinates lookup for hyper-local mapping & Overpass queries
export const DISTRICT_COORDINATES = {
  // Uttar Pradesh
  "Meerut": [28.9845, 77.7064],
  "Sardhana": [29.1437, 77.6163],
  "Agra": [27.1767, 78.0081],
  "Aligarh": [27.8974, 78.0880],
  "Ayodhya": [26.7922, 82.1998],
  "Bareilly": [28.3670, 79.4304],
  "Ghaziabad": [28.6692, 77.4538],
  "Gorakhpur": [26.7606, 83.3732],
  "Jhansi": [25.4484, 78.5685],
  "Kanpur Nagar": [26.4499, 80.3319],
  "Kanpur": [26.4499, 80.3319],
  "Lucknow": [26.8467, 80.9462],
  "Mathura": [27.4924, 77.6737],
  "Moradabad": [28.8386, 78.7733],
  "Muzaffarnagar": [29.4727, 77.7085],
  "Prayagraj": [25.4358, 81.8463],
  "Saharanpur": [29.9678, 77.5510],
  "Varanasi": [25.3176, 82.9739],

  // Bihar
  "Patna": [25.5941, 85.1376],
  "Gaya": [24.7914, 85.0002],
  "Bhagalpur": [25.2425, 86.9842],
  "Muzaffarpur": [26.1209, 85.3647],
  "Darbhanga": [26.1542, 85.8918],

  // Rajasthan
  "Jaipur": [26.9124, 75.7873],
  "Jodhpur": [26.2389, 73.0243],
  "Kota": [25.2138, 75.8648],
  "Udaipur": [24.5854, 73.7125],
  "Bikaner": [28.0229, 73.3119],

  // Madhya Pradesh
  "Bhopal": [23.2599, 77.4126],
  "Indore": [22.7196, 75.8577],
  "Gwalior": [26.2183, 78.1828],
  "Jabalpur": [23.1815, 79.9864],
  "Ujjain": [23.1765, 75.7885],

  // Maharashtra
  "Mumbai": [19.0760, 72.8777],
  "Pune": [18.5204, 73.8567],
  "Nagpur": [21.1458, 79.0882],
  "Nashik": [19.9975, 73.7898],
  "Aurangabad": [19.8762, 75.3433],
  "Kolhapur": [16.7050, 74.2433],

  // Punjab & Haryana
  "Ludhiana": [30.9010, 75.8573],
  "Amritsar": [31.6340, 74.8723],
  "Jalandhar": [31.3260, 75.5762],
  "Gurugram": [28.4595, 77.0266],
  "Faridabad": [28.4089, 77.3178],
  "Panipat": [29.3909, 76.9635],
  "Karnal": [29.6857, 76.9905],

  // Gujarat
  "Ahmedabad": [23.0225, 72.5714],
  "Surat": [21.1702, 72.8311],
  "Vadodara": [22.3072, 73.1812],
  "Rajkot": [22.3039, 70.8022],

  // West Bengal
  "Kolkata": [22.5726, 88.3639],
  "Howrah": [22.5958, 88.2636],
  "Siliguri": [26.7271, 88.3953],

  // South India
  "Bengaluru": [12.9716, 77.5946],
  "Hyderabad": [17.3850, 78.4867],
  "Chennai": [13.0827, 80.2707],
  "Visakhapatnam": [17.6868, 83.2185],
};

// Retrieve coordinates for district or fallback to Meerut, UP
export function getDistrictCoordinates(districtName) {
  if (!districtName) return [28.9845, 77.7064];
  const cleanName = districtName.trim();
  if (DISTRICT_COORDINATES[cleanName]) {
    return DISTRICT_COORDINATES[cleanName];
  }
  // Case-insensitive match
  const foundKey = Object.keys(DISTRICT_COORDINATES).find(
    (k) => k.toLowerCase() === cleanName.toLowerCase()
  );
  if (foundKey) {
    return DISTRICT_COORDINATES[foundKey];
  }
  return [28.9845, 77.7064]; // Meerut fallback
}

// Convert business category to Overpass OSM tag
export function getCategoryOsmTag(categoryName) {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("dairy") || cat.includes("milk") || cat.includes("डेयरी")) {
    return "shop=dairy";
  }
  if (
    cat.includes("kirana") ||
    cat.includes("grocery") ||
    cat.includes("general") ||
    cat.includes("convenience") ||
    cat.includes("किराना")
  ) {
    return "shop=convenience";
  }
  if (
    cat.includes("tailor") ||
    cat.includes("garment") ||
    cat.includes("weaving") ||
    cat.includes("सिलाई")
  ) {
    return "craft=tailor";
  }
  if (
    cat.includes("vegetable") ||
    cat.includes("fruit") ||
    cat.includes("फल") ||
    cat.includes("सब्जी")
  ) {
    return "shop=greengrocer";
  }
  if (
    cat.includes("poultry") ||
    cat.includes("egg") ||
    cat.includes("chicken") ||
    cat.includes("पोल्ट्री")
  ) {
    return "shop=butcher";
  }
  if (cat.includes("hardware") || cat.includes("हार्डवेयर")) {
    return "shop=hardware";
  }
  if (
    cat.includes("tea") ||
    cat.includes("dhaba") ||
    cat.includes("eatery") ||
    cat.includes("food cart") ||
    cat.includes("चाय")
  ) {
    return "amenity=cafe";
  }
  if (
    cat.includes("mobile") ||
    cat.includes("repair") ||
    cat.includes("photocopy") ||
    cat.includes("मोबाइल")
  ) {
    return "shop=mobile_phone";
  }
  if (cat.includes("salon") || cat.includes("beauty") || cat.includes("ब्यूटी")) {
    return "shop=hairdresser";
  }
  if (
    cat.includes("bakery") ||
    cat.includes("food processing") ||
    cat.includes("बेकरी")
  ) {
    return "shop=bakery";
  }
  if (
    cat.includes("carpenter") ||
    cat.includes("blacksmith") ||
    cat.includes("artisan") ||
    cat.includes("बढ़ई")
  ) {
    return "craft=carpenter";
  }
  return "shop=convenience";
}
