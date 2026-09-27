import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Forces the Leaflet camera to move when coordinates change
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Updated interface expecting all 4 location details
interface InteractiveMapProps {
  onLocationFound?: (state: string, district: string, pin: string, block: string) => void;
}

export default function InteractiveMap({ onLocationFound }: InteractiveMapProps) {
  const [position, setPosition] = useState<[number, number]>([21.1458, 79.0882]);
  const [locationDetails, setLocationDetails] = useState("Detecting your location...");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              {
                headers: {
                  "User-Agent": "VyapaarAI-InteractiveMap/1.0",
                  "Accept-Language": "en,hi",
                },
                signal: controller.signal,
              }
            );
            clearTimeout(timer);

            if (!res.ok) {
              throw new Error(`Nominatim returned HTTP ${res.status}`);
            }

            const data = await res.json();
            const address = data?.address || {};
            
            const state = address.state || "";
            const district = address.state_district || address.county || "Unknown District";
            const pin = address.postcode || "Unknown PIN";
            const block =
              address.subdistrict ||
              address.county ||
              address.suburb ||
              address.town ||
              address.village ||
              "";
            
            setLocationDetails(`District: ${district}${block ? ` | Block: ${block}` : ''} | PIN: ${pin}`);
            
            if (onLocationFound) {
              onLocationFound(state, district, pin, block);
            }
          } catch (error) {
            clearTimeout(timer);
            console.error("Geocoding failed", error);
            setLocationDetails("Failed to fetch area details from map server.");
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLocationDetails("Location access denied or unavailable. Please fill the form manually.");
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>📍 {locationDetails}</h3>
      <MapContainer 
        center={position} 
        zoom={12} 
        style={{ height: '350px', width: '100%', borderRadius: '12px', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={position} />
        <Marker position={position}>
          <Popup>{locationDetails}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}