import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Define the prop we will receive from App.jsx
interface MapProps {
  onLocationFound?: (district: string, pin: string) => void;
}

export default function InteractiveMap({ onLocationFound }: MapProps) {
  const [position, setPosition] = useState<[number, number]>([21.1458, 79.0882]);
  const [locationDetails, setLocationDetails] = useState("Click 'Allow' to detect your Tehsil/Block...");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const district = data.address.state_district || data.address.county || "Unknown District";
          const pin = data.address.postcode || "Unknown PIN";
          
          setLocationDetails(`District: ${district} | PIN: ${pin}`);
          
          if (onLocationFound) {
            onLocationFound(district, pin);
          }
        } catch (error) {
          console.error("Geocoding failed", error);
        }
      });
    }
  }, [onLocationFound]);

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
        <Marker position={position}>
          <Popup>{locationDetails}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}