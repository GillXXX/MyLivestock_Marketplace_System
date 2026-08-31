import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletMap.css";

const TILE_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
};

function buildDivIcon(color, pulse) {
  return L.divIcon({
    className: "leaflet-dot-icon",
    html: `<span class="leaflet-dot${pulse ? " leaflet-dot-pulse" : ""}" style="--dot-color:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function buildPinIcon(color, pulse) {
  return L.divIcon({
    className: "leaflet-pin-icon",
    html: `
      <span class="leaflet-pin${pulse ? " leaflet-pin-pulse" : ""}" style="--pin-color:${color}">
        <svg viewBox="0 0 24 32" width="25" height="33" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="var(--pin-color)"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </span>
    `,
    iconSize: [25, 33],
    iconAnchor: [12.5, 33],
    popupAnchor: [0, -31],
  });
}

function buildBarangayIcon() {
  return L.divIcon({
    className: "leaflet-barangay-icon",
    html: `<span class="leaflet-barangay-dot"></span>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

/**
 * Thin imperative wrapper around Leaflet so the app doesn't depend on a
 * react-leaflet version matched to this React major version.
 *
 * markers: [{ id, lat, lng, color, popupHtml, pulse, shape: "dot" | "pin" }]
 * barangayLabels: [{ name, lat, lng }] - always-visible reference dots/labels
 * boundary: GeoJSON Polygon - drawn as an outline (e.g. municipal boundary)
 * bounds: [[south, west], [north, east]] - paired with restrictToBounds
 * layerToggle: show a street/satellite basemap switcher control
 * onMapClick(lat, lng): enables click-to-pick mode
 * pickedPosition: [lat, lng] | null - shows a draggable pick marker
 */
const LeafletMap = forwardRef(function LeafletMap(
  {
    center,
    zoom = 13,
    minZoom,
    height = "320px",
    markers = [],
    barangayLabels = [],
    boundary,
    bounds,
    restrictToBounds = false,
    layerToggle = false,
    onMapClick,
    pickedPosition,
    className = "",
  },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersByIdRef = useRef({});
  const barangayLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const pickMarkerRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  const [basemap, setBasemap] = useState("street");

  onMapClickRef.current = onMapClick;

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, targetZoom) {
      if (mapRef.current && lat != null && lng != null) {
        mapRef.current.flyTo([lat, lng], targetZoom || mapRef.current.getZoom(), {
          duration: 0.8,
        });
      }
    },
    openPopup(id) {
      const marker = markersByIdRef.current[id];
      if (marker) marker.openPopup();
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      minZoom,
      scrollWheelZoom: false,
      maxBounds: restrictToBounds && bounds ? L.latLngBounds(bounds) : null,
      maxBoundsViscosity: restrictToBounds ? 1.0 : 0,
    });

    tileLayerRef.current = L.tileLayer(
      TILE_LAYERS.street.url,
      TILE_LAYERS.street.options
    ).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    barangayLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();
    const layerConfig = TILE_LAYERS[basemap] || TILE_LAYERS.street;
    tileLayerRef.current = L.tileLayer(layerConfig.url, layerConfig.options).addTo(
      mapRef.current
    );
    tileLayerRef.current.bringToBack();
  }, [basemap]);

  useEffect(() => {
    if (!mapRef.current || !boundary) return;

    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.remove();
    }

    boundaryLayerRef.current = L.geoJSON(boundary, {
      style: {
        color: basemap === "satellite" ? "#ffe27a" : "#0f3d2e",
        weight: 2.5,
        opacity: 0.9,
        fill: true,
        fillOpacity: basemap === "satellite" ? 0 : 0.03,
        dashArray: "6 6",
      },
      interactive: false,
    }).addTo(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary, basemap]);

  useEffect(() => {
    if (!mapRef.current || !barangayLayerRef.current) return;

    barangayLayerRef.current.clearLayers();

    barangayLabels.forEach((barangay) => {
      if (barangay.lat == null || barangay.lng == null) return;

      L.marker([barangay.lat, barangay.lng], {
        icon: buildBarangayIcon(),
        interactive: false,
        keyboard: false,
      })
        .bindTooltip(barangay.name, {
          permanent: true,
          direction: "top",
          className: `leaflet-barangay-label ${
            basemap === "satellite" ? "on-satellite" : ""
          }`,
          offset: [0, -4],
        })
        .addTo(barangayLayerRef.current);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangayLabels, basemap]);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    markersByIdRef.current = {};

    markers.forEach((marker) => {
      if (marker.lat == null || marker.lng == null) return;

      const icon =
        marker.shape === "pin"
          ? buildPinIcon(marker.color || "#b8842c", marker.pulse)
          : buildDivIcon(marker.color || "#b8842c", marker.pulse);
      const leafletMarker = L.marker([marker.lat, marker.lng], { icon });

      if (marker.popupHtml) {
        leafletMarker.bindPopup(marker.popupHtml, { autoPan: false });
      }

      leafletMarker.addTo(markersLayerRef.current);

      if (marker.id != null) {
        markersByIdRef.current[marker.id] = leafletMarker;
      }
    });
  }, [markers]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!pickedPosition) {
      if (pickMarkerRef.current) {
        pickMarkerRef.current.remove();
        pickMarkerRef.current = null;
      }
      return;
    }

    if (!pickMarkerRef.current) {
      pickMarkerRef.current = L.marker(pickedPosition, {
        icon: buildPinIcon("#d7a24d", true),
        draggable: true,
      })
        .addTo(mapRef.current)
        .on("dragend", (e) => {
          const { lat, lng } = e.target.getLatLng();
          if (onMapClickRef.current) onMapClickRef.current(lat, lng);
        });
    } else {
      pickMarkerRef.current.setLatLng(pickedPosition);
    }
  }, [pickedPosition]);

  return (
    <div className={`leaflet-map-wrap ${className}`} style={{ position: "relative" }}>
      <div ref={containerRef} className="leaflet-map-container" style={{ height, width: "100%" }} />

      {layerToggle && (
        <div className="leaflet-basemap-toggle">
          <button
            type="button"
            className={basemap === "street" ? "active" : ""}
            onClick={() => setBasemap("street")}
          >
            Map
          </button>
          <button
            type="button"
            className={basemap === "satellite" ? "active" : ""}
            onClick={() => setBasemap("satellite")}
          >
            Satellite
          </button>
        </div>
      )}
    </div>
  );
});

export default LeafletMap;
