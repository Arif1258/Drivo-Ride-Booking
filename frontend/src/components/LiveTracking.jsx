import React, { useState, useEffect, useRef, useContext } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const LiveTracking = ({ pickup, destination, ride }) => {
    const { socket } = useContext(SocketContext);

    const [viewState, setViewState] = useState({
        latitude: 22.5726,
        longitude: 88.3639,
        zoom: 11
    });

    const [currentPosition, setCurrentPosition] = useState(null);
    const [driverPosition, setDriverPosition] = useState(null);
    const [pickupCoords, setPickupCoords] = useState(null);
    const [destCoords, setDestCoords] = useState(null);
    const [routeGeoJson, setRouteGeoJson] = useState(null);
    const intervalRef = useRef(null);

    const targetPickup = pickup || ride?.pickup;
    const targetDestination = destination || ride?.destination;

    // Get current passenger position (fallback / user marker)
    const updatePosition = () => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({ latitude, longitude });
            
            if (!pickupCoords && !destCoords && !driverPosition) {
                setViewState(prev => ({ ...prev, latitude, longitude, zoom: 14 }));
            }
        }, (error) => {
            console.warn("Geolocation warning:", error);
        });
    };

    useEffect(() => {
        updatePosition();

        const watchId = navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({ latitude, longitude });
            if (!pickupCoords && !destCoords && !driverPosition) {
                setViewState(prev => ({ ...prev, latitude, longitude }));
            }
        });

        intervalRef.current = setInterval(updatePosition, 10000);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            clearInterval(intervalRef.current);
        };
    }, [pickupCoords, destCoords, driverPosition]);

    // Handle Socket updates for real-time driver positioning
    useEffect(() => {
        if (!socket) return;

        // Populate initial driver location if captain profile has it
        if (ride?.captain?.location?.coordinates) {
            const [lng, lat] = ride.captain.location.coordinates;
            setDriverPosition({ latitude: lat, longitude: lng });
        }

        socket.on('captain-location-updated', (data) => {
            console.log("📡 [Socket] Live driver location update received:", data);
            setDriverPosition({ latitude: data.latitude, longitude: data.longitude });
        });

        let intervalId;
        const pollCaptainLocation = async () => {
            if (ride?.captain?._id) {
                try {
                    const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/location/${ride.captain._id}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (response.data?.location?.coordinates) {
                        const [lng, lat] = response.data.location.coordinates;
                        console.log("Polling captain location:", lat, lng);
                        setDriverPosition({ latitude: lat, longitude: lng });
                    }
                } catch (err) {
                    console.log("Error polling captain location:", err.message);
                }
            }
        };

        if (ride?.captain?._id) {
            intervalId = setInterval(pollCaptainLocation, 5000);
            pollCaptainLocation();
        }

        return () => {
            socket.off('captain-location-updated');
            if (intervalId) clearInterval(intervalId);
        };
    }, [socket, ride]);

    // Geocode pickup and destination addresses and fetch routing geometry
    useEffect(() => {
        const fetchCoordinatesAndRoute = async () => {
            if (!targetPickup || !targetDestination) {
                setPickupCoords(null);
                setDestCoords(null);
                setRouteGeoJson(null);
                return;
            }

            console.log("🔍 Geocoding Pickup Address:", targetPickup);
            console.log("🔍 Geocoding Destination Address:", targetDestination);

            try {
                // Geocode pickup address
                const pickupUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(targetPickup)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=IN`;
                const pickupResponse = await axios.get(pickupUrl);
                let pCoords = null;

                if (pickupResponse.data.features && pickupResponse.data.features.length > 0) {
                    const [lng, lat] = pickupResponse.data.features[0].center;
                    pCoords = { latitude: lat, longitude: lng };
                    setPickupCoords(pCoords);
                    console.log("📍 Geocoded Pickup Coordinates:", pCoords);
                }

                // Geocode destination address
                const destUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(targetDestination)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=IN`;
                const destResponse = await axios.get(destUrl);
                let dCoords = null;

                if (destResponse.data.features && destResponse.data.features.length > 0) {
                    const [lng, lat] = destResponse.data.features[0].center;
                    dCoords = { latitude: lat, longitude: lng };
                    setDestCoords(dCoords);
                    console.log("📍 Geocoded Destination Coordinates:", dCoords);
                }

                // If both coordinates are resolved, fetch route geometry and adjust view
                if (pCoords && dCoords) {
                    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pCoords.longitude},${pCoords.latitude};${dCoords.longitude},${dCoords.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
                    console.log("🛣️ Fetching Route API Request URL:", directionsUrl);
                    const directionsResponse = await axios.get(directionsUrl);

                    if (directionsResponse.data.routes && directionsResponse.data.routes.length > 0) {
                        const routeGeometry = directionsResponse.data.routes[0].geometry;
                        console.log("🛣️ Route API Geometry Response:", routeGeometry);
                        setRouteGeoJson({
                            type: 'Feature',
                            properties: {},
                            geometry: routeGeometry
                        });
                    }

                    // Fit viewport to bounds containing both markers
                    const midLat = (pCoords.latitude + dCoords.latitude) / 2;
                    const midLng = (pCoords.longitude + dCoords.longitude) / 2;
                    const latDiff = Math.abs(pCoords.latitude - dCoords.latitude);
                    const lngDiff = Math.abs(pCoords.longitude - dCoords.longitude);
                    const maxDiff = Math.max(latDiff, lngDiff);
                    
                    // Simple heuristic zoom calculation based on distance
                    const zoomLevel = Math.max(2, Math.min(14, 12 - Math.log2(maxDiff * 111 || 1)));

                    setViewState({
                        latitude: midLat,
                        longitude: midLng,
                        zoom: zoomLevel
                    });
                }
            } catch (error) {
                console.error("❌ Error fetching geocoding or directions:", error);
            }
        };

        fetchCoordinatesAndRoute();
    }, [targetPickup, targetDestination]);

    return (
        <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
        >
            {/* Passenger Position Marker */}
            {currentPosition && (
                <Marker
                    latitude={currentPosition.latitude}
                    longitude={currentPosition.longitude}
                    anchor="bottom"
                >
                    <div className="bg-blue-600 text-white rounded-full p-2 border-2 border-white shadow-lg flex items-center justify-center font-bold text-[10px] w-6 h-6">
                        👤
                    </div>
                </Marker>
            )}

            {/* Live Driver/Captain Position Marker */}
            {driverPosition && (
                <Marker
                    latitude={driverPosition.latitude}
                    longitude={driverPosition.longitude}
                    anchor="bottom"
                >
                    <div className="bg-black text-white rounded-full p-2 border-2 border-yellow-400 shadow-xl flex items-center justify-center font-bold text-xs w-7 h-7 animate-pulse">
                        🚗
                    </div>
                </Marker>
            )}

            {/* Pickup Marker */}
            {pickupCoords && (
                <Marker
                    latitude={pickupCoords.latitude}
                    longitude={pickupCoords.longitude}
                    anchor="bottom"
                >
                    <div className="bg-emerald-500 text-white rounded-full p-2 border-2 border-white shadow-lg flex items-center justify-center font-bold text-xs w-6 h-6">
                        P
                    </div>
                </Marker>
            )}

            {/* Destination Marker */}
            {destCoords && (
                <Marker
                    latitude={destCoords.latitude}
                    longitude={destCoords.longitude}
                    anchor="bottom"
                >
                    <div className="bg-rose-500 text-white rounded-full p-2 border-2 border-white shadow-lg flex items-center justify-center font-bold text-xs w-6 h-6">
                        D
                    </div>
                </Marker>
            )}

            {/* Route Polyline Layer */}
            {routeGeoJson && (
                <Source id="route" type="geojson" data={routeGeoJson}>
                    <Layer
                        id="route-layer"
                        type="line"
                        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                        paint={{ 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.8 }}
                    />
                </Source>
            )}
        </Map>
    );
};

export default LiveTracking;