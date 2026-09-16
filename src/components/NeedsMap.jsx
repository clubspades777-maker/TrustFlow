import React from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Interactive needs heatmap. Markers sized/colored by needs_level.
// Shows NGOs/fundraisers so donors can see underserved areas & "NGO near me".
const NEEDS_COLOR = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#16a34a",
  low: "#65a30d",
};

export default function NeedsMap({ items = [], center = [22.5, 80], zoom = 5, height = "420px" }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-emerald-200 shadow-sm" style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {items.filter((i) => i.lat && i.lng).map((i) => (
          <CircleMarker
            key={i.id}
            center={[i.lat, i.lng]}
            radius={i.needs_level === "critical" ? 14 : i.needs_level === "high" ? 11 : 8}
            pathOptions={{
              color: NEEDS_COLOR[i.needs_level] || NEEDS_COLOR.medium,
              fillColor: NEEDS_COLOR[i.needs_level] || NEEDS_COLOR.medium,
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold">{i.name || i.title}</div>
                <div className="text-gray-600">{i.city}, {i.state}</div>
                {i.needs_level && <div className="capitalize">Need: {i.needs_level}</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}