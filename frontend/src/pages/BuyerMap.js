import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Search,
  Store,
  Eye,
  MessageCircle,
  Navigation,
  Sparkles,
  ChevronDown,
  LocateFixed,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useGoBack from "../utils/useGoBack";
import LeafletMap from "../utils/LeafletMap";
import escapeHtml from "../utils/escapeHtml";
import ListingDetailsModal from "../components/ListingDetailsModal";
import InquiryModal from "../components/InquiryModal";
import BuyNowModal from "../components/BuyNowModal";
import {
  VERUELA_CENTER,
  VERUELA_BOUNDARY_GEOJSON,
  VERUELA_BARANGAYS,
} from "../utils/veruelaGeo";
import { haversineDistanceKm, formatDistance, useLiveLocation } from "../utils/geo";
import { fetchRoute } from "../utils/routing";
import { API_URL, DEFAULT_LISTING_IMAGE } from "../config";
import { getProductIcon, formatPrice } from "../utils/productCatalog";
import "./BuyerMap.css";

function isRecentlyPosted(time) {
  if (!time) return false;
  const diffDays = (Date.now() - new Date(time).getTime()) / 86400000;
  return diffDays <= 2;
}

function formatRoute(route) {
  if (!route) return null;

  const km = route.distanceKm.toFixed(1);

  if (route.isEstimate) {
    return `~${km} km away (straight-line estimate)`;
  }

  const mins = Math.max(1, Math.round(route.durationMin));
  return `${km} km · ${mins} min${mins === 1 ? "" : "s"} away`;
}

function BuyerMap() {
  const navigate = useNavigate();
  const goBack = useGoBack("/buyer-dashboard");
  const mapRef = useRef(null);

  const [listings, setListings] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailsListing, setDetailsListing] = useState(null);
  const [inquiryListing, setInquiryListing] = useState(null);
  const [buyNowListing, setBuyNowListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [nearestFirst, setNearestFirst] = useState(false);
  const [route, setRoute] = useState(null);
  const { location: liveLocation, status: locationStatus } = useLiveLocation();
  const [pickingLocation, setPickingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("buyerManualLocation"));
      return saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng) ? saved : null;
    } catch (error) {
      return null;
    }
  });
  // GPS wins when the browser allows it; otherwise fall back to the spot the
  // buyer tapped on the map (browsers block GPS on non-HTTPS addresses, e.g.
  // a phone opening the app over a plain LAN address).
  const buyerLocation = liveLocation || manualLocation;
  const lastRouteFetchRef = useRef(null);
  const [listingsOpen, setListingsOpen] = useState(false);
  const listingsMenuRef = useRef(null);
  const [followMode, setFollowMode] = useState(false);

  useEffect(() => {
    if (!listingsOpen) return undefined;

    const handleOutside = (e) => {
      if (listingsMenuRef.current && !listingsMenuRef.current.contains(e.target)) {
        setListingsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setListingsOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [listingsOpen]);

  const handlePickLocation = (lat, lng) => {
    const picked = { lat, lng };
    setManualLocation(picked);
    setPickingLocation(false);

    if (selectedListing?.farm_lat != null && selectedListing?.farm_lng != null) {
      mapRef.current?.fitBounds([
        [lat, lng],
        [Number(selectedListing.farm_lat), Number(selectedListing.farm_lng)],
      ]);
    } else {
      mapRef.current?.flyTo(lat, lng, 14);
    }
    try {
      localStorage.setItem("buyerManualLocation", JSON.stringify(picked));
    } catch (error) {
      // Not persisting is fine — the location still applies for this visit.
    }
  };

  const clearManualLocation = () => {
    setManualLocation(null);
    try {
      localStorage.removeItem("buyerManualLocation");
    } catch (error) {
      // Nothing to clean up if storage is unavailable.
    }
  };

  const getDistanceKm = (item) => {
    if (!buyerLocation || item.farm_lat == null || item.farm_lng == null) {
      return null;
    }
    return haversineDistanceKm(
      buyerLocation.lat,
      buyerLocation.lng,
      Number(item.farm_lat),
      Number(item.farm_lng)
    );
  };

  const defaultImage = DEFAULT_LISTING_IMAGE;

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(`${API_URL}/api/marketplace`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Failed to load map data");
          setLoading(false);
          return;
        }

        setListings(data.listings);
        setSelectedListing(data.listings[0] || null);
        setLoading(false);
      } catch (error) {
        setMessage("Cannot connect to backend server");
        setLoading(false);
      }
    };

    fetchListings();
  }, [navigate]);

  const filteredListings = useMemo(() => {
    const results = listings.filter((item) => {
      const search = searchText.toLowerCase();

      return (
        item.breed?.toLowerCase().includes(search) ||
        item.livestock_type?.toLowerCase().includes(search) ||
        item.location?.toLowerCase().includes(search) ||
        item.seller_name?.toLowerCase().includes(search)
      );
    });

    if (nearestFirst && buyerLocation) {
      results.sort((a, b) => {
        const da = getDistanceKm(a);
        const db = getDistanceKm(b);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }

    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, searchText, nearestFirst, buyerLocation]);

  const pinnedListings = useMemo(
    () =>
      filteredListings.filter(
        (item) => item.farm_lat != null && item.farm_lng != null
      ),
    [filteredListings]
  );

  const mapMarkers = useMemo(() => {
    const sellerMarkers = pinnedListings.map((item) => ({
      id: item.id,
      lat: Number(item.farm_lat),
      lng: Number(item.farm_lng),
      color: selectedListing?.id === item.id ? "#d7a24d" : "#b8842c",
      pulse: selectedListing?.id === item.id,
      shape: "pin",
      popupHtml: `
          <div class="map-popup">
            <strong>${escapeHtml(item.breed || item.livestock_type)}</strong>
            <span>${escapeHtml(item.location || "No address")}</span>
            <span>Seller: ${escapeHtml(item.seller_name || "Unknown")}</span>
            <span>${escapeHtml(formatPrice(item.price, item.unit))}</span>
            ${
              getDistanceKm(item) != null
                ? `<span>${escapeHtml(formatDistance(getDistanceKm(item)))} from you</span>`
                : ""
            }
          </div>
        `,
    }));

    if (!buyerLocation) return sellerMarkers;

    return [
      ...sellerMarkers,
      {
        id: "you-are-here",
        lat: buyerLocation.lat,
        lng: buyerLocation.lng,
        color: "#2563eb",
        pulse: true,
        shape: "dot",
        popupHtml: `<div class="map-popup"><strong>You are here</strong></div>`,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedListings, selectedListing, buyerLocation]);

  const handleSelectListing = (item) => {
    setSelectedListing(item);
    setListingsOpen(false);

    if (item.farm_lat != null && item.farm_lng != null) {
      if (buyerLocation) {
        mapRef.current?.fitBounds([
          [buyerLocation.lat, buyerLocation.lng],
          [Number(item.farm_lat), Number(item.farm_lng)],
        ]);
      } else {
        mapRef.current?.flyTo(Number(item.farm_lat), Number(item.farm_lng), 15);
      }
    }
  };

  useEffect(() => {
    if (selectedListing?.farm_lat != null && selectedListing?.farm_lng != null) {
      mapRef.current?.openPopup(selectedListing.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListing?.id]);

  useEffect(() => {
    setRoute(null);
    lastRouteFetchRef.current = null;
  }, [selectedListing?.id]);

  // "Follow me": recenter on the buyer's real GPS fix as it updates, like a
  // basic navigation view. Only tracks live GPS, not a manually-set pin —
  // a manual pin never moves, so following it would do nothing.
  useEffect(() => {
    if (!followMode || !liveLocation) return;
    mapRef.current?.centerOn(liveLocation.lat, liveLocation.lng, 16);
  }, [followMode, liveLocation]);

  const handleToggleFollow = () => {
    setFollowMode((prev) => {
      const next = !prev;
      if (next && liveLocation) {
        mapRef.current?.centerOn(liveLocation.lat, liveLocation.lng, 16);
      }
      return next;
    });
  };

  // Fetch a real route + ETA for the selected farmer, throttled so we don't
  // hit the free OSRM endpoint on every GPS tick — only refetch when the
  // selection changes, the buyer has moved meaningfully, or enough time has
  // passed since the last fetch.
  useEffect(() => {
    const farmLat = selectedListing?.farm_lat;
    const farmLng = selectedListing?.farm_lng;

    if (!buyerLocation || farmLat == null || farmLng == null) {
      setRoute(null);
      return;
    }

    const last = lastRouteFetchRef.current;
    const movedKm = last
      ? haversineDistanceKm(last.lat, last.lng, buyerLocation.lat, buyerLocation.lng)
      : Infinity;
    const secondsSinceLastFetch = last ? (Date.now() - last.time) / 1000 : Infinity;

    if (
      last &&
      last.listingId === selectedListing.id &&
      movedKm < 0.03 &&
      secondsSinceLastFetch < 12
    ) {
      return;
    }

    lastRouteFetchRef.current = {
      lat: buyerLocation.lat,
      lng: buyerLocation.lng,
      listingId: selectedListing.id,
      time: Date.now(),
    };

    let cancelled = false;

    fetchRoute(buyerLocation.lat, buyerLocation.lng, Number(farmLat), Number(farmLng)).then(
      (result) => {
        if (cancelled) return;

        if (result) {
          setRoute({ ...result, isEstimate: false });
        } else {
          setRoute({
            coordinates: [
              [buyerLocation.lat, buyerLocation.lng],
              [Number(farmLat), Number(farmLng)],
            ],
            distanceKm: haversineDistanceKm(
              buyerLocation.lat,
              buyerLocation.lng,
              Number(farmLat),
              Number(farmLng)
            ),
            durationMin: null,
            isEstimate: true,
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListing?.id, buyerLocation]);

  const handleViewDetails = (item) => {
    setDetailsListing(item);

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/marketplace/${item.id}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="buyer-map-page">
        <div className="map-skeleton">
          <div className="skel skel-map-header"></div>
          <div className="skel skel-map-main"></div>
        </div>
      </div>
    );
  }

  if (message) return <h2 style={{ padding: "30px", color: "red" }}>{message}</h2>;

  return (
    <div className="buyer-map-page">
      <header className="map-header">
        <div className="header-left">
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

          <div>
            <span className="page-tag">BUYER MAP EXPLORER</span>
            <h1>Nearby Seller Map</h1>
            <p>
              View livestock sellers and available listings by farm location.
            </p>
          </div>
        </div>

        <div className="header-right">
          <div className="header-stat">
            <Navigation size={16} />
            <span>
              {pinnedListings.length} of {filteredListings.length} sellers pinned
            </span>
          </div>

          <div className="listings-dropdown" ref={listingsMenuRef}>
            <button
              type="button"
              className={`listings-toggle ${listingsOpen ? "active" : ""}`}
              onClick={() => setListingsOpen((open) => !open)}
              aria-expanded={listingsOpen}
            >
              <Store size={15} />
              <span className="listings-toggle-label">Seller Listings</span>
              <span className="listings-toggle-count">{filteredListings.length}</span>
              <ChevronDown size={14} className="listings-toggle-chevron" />
            </button>

            {listingsOpen && (
              <div className="listings-panel">
                <div className="seller-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search seller, livestock, location..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    // On phones this would pop the keyboard over the
                    // bottom sheet before the buyer even sees the list.
                    autoFocus={!window.matchMedia("(max-width: 768px)").matches}
                  />
                </div>

                {buyerLocation ? (
                  <button
                    type="button"
                    className={`nearest-toggle ${nearestFirst ? "active" : ""}`}
                    onClick={() => setNearestFirst((prev) => !prev)}
                  >
                    <Navigation size={14} />
                    Nearest first
                  </button>
                ) : (
                  (locationStatus === "denied" || locationStatus === "unsupported") && (
                    <p className="location-permission-hint">
                      <MapPin size={13} />
                      Enable location access to sort sellers by distance.
                    </p>
                  )
                )}

                <div className="seller-list">
                  {filteredListings.length === 0 ? (
                    <div className="seller-list-empty">
                      <Search size={26} />
                      <p>No sellers found</p>
                      <span>Try a different search term.</span>
                    </div>
                  ) : (
                    filteredListings.map((item) => {
                      const SpeciesIcon = getProductIcon(item.livestock_type, item.category);

                      return (
                      <button
                        className={
                          selectedListing?.id === item.id
                            ? "seller-card active"
                            : "seller-card"
                        }
                        key={item.id}
                        onClick={() => handleSelectListing(item)}
                      >
                        <div className="seller-card-image">
                          <img src={item.image_url || defaultImage} alt={item.breed || item.livestock_type} />
                          {isRecentlyPosted(item.created_at) && (
                            <span className="seller-new-badge">
                              <Sparkles size={10} />
                              New
                            </span>
                          )}
                        </div>

                        <div className="seller-card-body">
                          <div className="seller-card-top">
                            <strong>{item.breed || item.livestock_type}</strong>
                            <span className="seller-price">
                              {formatPrice(item.price, item.unit)}
                            </span>
                          </div>

                          <p>
                            <SpeciesIcon size={12} />
                            {item.livestock_type}
                          </p>

                          <span className="seller-location">
                            <MapPin size={13} />
                            {item.location}
                          </span>

                          <div className="seller-card-footer">
                            <small>Seller: {item.seller_name}</small>
                            {item.farm_lat == null ? (
                              <span className="unpinned-badge">Unpinned</span>
                            ) : (
                              getDistanceKm(item) != null && (
                                <span className="distance-badge">
                                  {formatDistance(getDistanceKm(item))}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="map-layout">
        <main className="map-main-panel">
          <div className="map-card-heading">
            <div>
              <h3>Seller Location Map</h3>
              <p>
                {pinnedListings.length} of {filteredListings.length} matching
                sellers have a pinned farm location.
              </p>
            </div>

            <div className="map-legend">
              <span>
                <i className="legend-dot"></i>Farm pin
              </span>
              <span>
                <i className="legend-dot active"></i>Selected
              </span>
            </div>
          </div>

          {pickingLocation ? (
            <div className="location-banner picking">
              <MapPin size={16} />
              <span>Tap the map where you are.</span>
              <button type="button" onClick={() => setPickingLocation(false)}>
                Cancel
              </button>
            </div>
          ) : liveLocation ? null : manualLocation ? (
            <div className="location-banner">
              <MapPin size={16} />
              <span>Using the location you set on the map.</span>
              <button type="button" onClick={() => setPickingLocation(true)}>
                Change
              </button>
              <button type="button" onClick={clearManualLocation}>
                Clear
              </button>
            </div>
          ) : (
            (locationStatus === "denied" || locationStatus === "unsupported") && (
              <div className="location-banner warn">
                <MapPin size={16} />
                <span>
                  {window.isSecureContext
                    ? "Location access is blocked."
                    : "GPS is blocked on this connection (not HTTPS)."}{" "}
                  Set your location on the map to see the route and distance to sellers.
                </span>
                <button type="button" onClick={() => setPickingLocation(true)}>
                  Set my location
                </button>
              </div>
            )
          )}

          <div className={`map-preview-box ${pickingLocation ? "picking" : ""}`}>
            <LeafletMap
              ref={mapRef}
              onMapClick={pickingLocation ? handlePickLocation : undefined}
              onUserDrag={() => setFollowMode(false)}
              center={VERUELA_CENTER}
              zoom={12}
              height="520px"
              markers={mapMarkers}
              barangayLabels={VERUELA_BARANGAYS}
              boundary={VERUELA_BOUNDARY_GEOJSON}
              route={route?.coordinates}
              routeIsEstimate={route?.isEstimate}
              layerToggle
            />

            {liveLocation && !pickingLocation && (
              <button
                type="button"
                className={`follow-me-fab ${followMode ? "active" : ""}`}
                onClick={handleToggleFollow}
                aria-pressed={followMode}
                title={followMode ? "Stop following my location" : "Follow my location"}
              >
                <LocateFixed size={18} />
              </button>
            )}
          </div>

          {pinnedListings.length === 0 && (
            <div className="map-empty-hint">
              <Navigation size={16} />
              <span>None of the matching sellers have a pinned farm location yet.</span>
            </div>
          )}

          {selectedListing && (
            <div className="selected-seller-card">
              <img
                src={selectedListing.image_url || defaultImage}
                alt={selectedListing.breed || selectedListing.livestock_type}
              />

              <div className="selected-info">
                <span className="selected-type-badge">
                  {(() => {
                    const SelectedIcon = getProductIcon(
                      selectedListing.livestock_type,
                      selectedListing.category
                    );
                    return <SelectedIcon size={12} />;
                  })()}
                  {selectedListing.livestock_type}
                </span>
                {isRecentlyPosted(selectedListing.created_at) && (
                  <span className="selected-new-badge">
                    <Sparkles size={11} />
                    New
                  </span>
                )}
                <h2>{selectedListing.breed || selectedListing.livestock_type}</h2>
                <p>
                  <MapPin size={15} />
                  {selectedListing.location}
                </p>

                <strong>
                  {formatPrice(selectedListing.price, selectedListing.unit)}
                </strong>

                <small>Seller: {selectedListing.seller_name}</small>
                {route ? (
                  <span className={`distance-badge ${route.isEstimate ? "estimate" : ""}`}>
                    <Navigation size={12} />
                    {formatRoute(route)}
                  </span>
                ) : (
                  getDistanceKm(selectedListing) != null && (
                    <span className="distance-badge">
                      <Navigation size={12} />
                      {formatDistance(getDistanceKm(selectedListing))}
                    </span>
                  )
                )}
              </div>

              <div className="selected-actions">
                <button
                  type="button"
                  onClick={() => handleViewDetails(selectedListing)}
                >
                  <Eye size={17} />
                  View Details
                </button>

                <button
                  type="button"
                  className="inquire-btn"
                  onClick={() => setInquiryListing(selectedListing)}
                >
                  <MessageCircle size={17} />
                  Inquire
                </button>
              </div>
            </div>
          )}
        </main>
      </section>

      {detailsListing && (
        <ListingDetailsModal
          listing={detailsListing}
          onClose={() => setDetailsListing(null)}
          onInquire={(item) => setInquiryListing(item)}
          onBuyNow={(item) => setBuyNowListing(item)}
        />
      )}

      {inquiryListing && (
        <InquiryModal
          listing={inquiryListing}
          onClose={() => setInquiryListing(null)}
        />
      )}

      {buyNowListing && (
        <BuyNowModal
          listing={buyNowListing}
          onClose={() => setBuyNowListing(null)}
        />
      )}
    </div>
  );
}

export default BuyerMap;
