import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "mapbox-gl/dist/mapbox-gl.css";
import { along, lineString, length } from "@turf/turf";
import mapboxgl, {} from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
const HOME_CENTER = [14.633576, 48.250435];
const HOME_ZOOM = 8;
const ANIMATION_DURATION = 20000;
const AUTO_REFIT_COOLDOWN = 900;
const ANIMATION_PITCH = 56;
const ANIMATION_BEARING = 150;
const ANIMATION_PADDING = 72;
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";
function getGeohashPrecisionForZoom(zoom) {
    if (zoom < 6) {
        return 3;
    }
    if (zoom < 8) {
        return 4;
    }
    if (zoom < 10) {
        return 5;
    }
    if (zoom < 12) {
        return 6;
    }
    if (zoom < 14) {
        return 7;
    }
    return 8;
}
function getDistanceBetweenCoordinates(start, end) {
    const earthRadiusKm = 6371;
    const latitudeDelta = ((end[1] - start[1]) * Math.PI) / 180;
    const longitudeDelta = ((end[0] - start[0]) * Math.PI) / 180;
    const startLatitude = (start[1] * Math.PI) / 180;
    const endLatitude = (end[1] * Math.PI) / 180;
    const a = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
        Math.cos(startLatitude) *
            Math.cos(endLatitude) *
            Math.sin(longitudeDelta / 2) *
            Math.sin(longitudeDelta / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getFarthestPointPair(coordinatePairs) {
    let farthestPair = null;
    for (let startIndex = 0; startIndex < coordinatePairs.length - 1; startIndex += 1) {
        for (let endIndex = startIndex + 1; endIndex < coordinatePairs.length; endIndex += 1) {
            const start = coordinatePairs[startIndex];
            const end = coordinatePairs[endIndex];
            const distanceKm = getDistanceBetweenCoordinates(start, end);
            if (!farthestPair || distanceKm > farthestPair.distanceKm) {
                farthestPair = {
                    distanceKm,
                    start,
                    end,
                };
            }
        }
    }
    return farthestPair;
}
function getAnimationCamera(map, farthestPair) {
    if (!farthestPair) {
        return {
            center: HOME_CENTER,
            zoom: 12,
        };
    }
    const center = [
        (farthestPair.start[0] + farthestPair.end[0]) / 2,
        (farthestPair.start[1] + farthestPair.end[1]) / 2,
    ];
    const camera = map.cameraForBounds([farthestPair.start, farthestPair.end], {
        padding: {
            top: ANIMATION_PADDING,
            right: ANIMATION_PADDING,
            bottom: ANIMATION_PADDING,
            left: ANIMATION_PADDING,
        },
        pitch: ANIMATION_PITCH,
        bearing: ANIMATION_BEARING,
    });
    return {
        center,
        zoom: Math.max(camera?.zoom ?? 12, HOME_ZOOM),
    };
}
function getTourSlug(title) {
    return title
        .trim()
        .toLowerCase()
        .replace(/ß/g, "ss")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/ /g, "-");
}
function getTourSummaryFromBundle(tour) {
    return {
        id: tour.id,
        title: tour.title,
        city: tour.city,
        slug: getTourSlug(tour.title),
        coordinates: tour.geo.main.map(Number),
    };
}
export function MapView({ tours, selectedTour, onTourClick }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerLookupRef = useRef({});
    const toursRef = useRef(tours);
    const onTourClickRef = useRef(onTourClick);
    const animationRunningRef = useRef(false);
    const lastAutoRefitRef = useRef(0);
    const activeAnimationRef = useRef({
        startTime: null,
        tour: null,
        path: null,
        pathDistance: 0,
        marker: null,
        popup: null,
        frameId: null,
    });
    const [isAnimating, setIsAnimating] = useState(false);
    const [canZoomOut, setCanZoomOut] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    useEffect(() => {
        toursRef.current = tours;
    }, [tours]);
    useEffect(() => {
        onTourClickRef.current = onTourClick;
    }, [onTourClick]);
    const updatePopup = (tour, popup, elevation) => {
        const content = document.createElement("div");
        content.className = "tour-map-popup";
        const title = document.createElement("strong");
        title.textContent = tour.title;
        content.appendChild(title);
        if (typeof elevation === "number") {
            const elevationText = document.createElement("div");
            elevationText.textContent = `Höhe: ${elevation}m`;
            content.appendChild(elevationText);
        }
        else if (tour.city) {
            const cityText = document.createElement("div");
            cityText.textContent = tour.city;
            content.appendChild(cityText);
        }
        popup.setDOMContent(content);
    };
    const syncPopupToMarker = (popup, marker) => {
        popup.setLngLat(marker.getLngLat());
        popup.setOffset([0, -28]);
    };
    const cleanUp = (map) => {
        const activeAnimation = activeAnimationRef.current;
        if (activeAnimation.frameId !== null) {
            window.cancelAnimationFrame(activeAnimation.frameId);
        }
        if (activeAnimation.tour) {
            const layerId = `line-${activeAnimation.tour.id}`;
            if (map?.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
            if (map?.getSource(layerId)) {
                map.removeSource(layerId);
            }
        }
        activeAnimation.popup?.remove();
        activeAnimationRef.current = {
            startTime: null,
            tour: null,
            path: null,
            pathDistance: 0,
            marker: null,
            popup: null,
            frameId: null,
        };
        animationRunningRef.current = false;
        setIsAnimating(false);
        setCanZoomOut(false);
    };
    const parseGeometry = (geometry) => {
        const coordinates = geometry.split(/\s+/).filter(Boolean);
        const coordinatePairs = [];
        for (let index = 0; index < coordinates.length; index += 2) {
            const latitude = Number(coordinates[index]);
            const longitude = Number(coordinates[index + 1]);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                continue;
            }
            coordinatePairs.push([longitude, latitude]);
        }
        return coordinatePairs;
    };
    const getVisibleBuckets = (map) => {
        const bounds = map.getBounds();
        if (!bounds) {
            return [];
        }
        const precision = getGeohashPrecisionForZoom(map.getZoom());
        const buckets = new Map();
        const center = map.getCenter();
        for (const tour of toursRef.current) {
            const [longitude, latitude] = tour.coordinates.map(Number);
            if (!bounds.contains([longitude, latitude])) {
                continue;
            }
            const bucketKey = tour.geohash?.slice(0, precision) || tour.id;
            const distanceToCenter = getDistanceBetweenCoordinates([center.lng, center.lat], [longitude, latitude]);
            const existingBucket = buckets.get(bucketKey);
            if (!existingBucket || distanceToCenter < existingBucket.distanceToCenter) {
                buckets.set(bucketKey, {
                    bucketKey,
                    tour,
                    distanceToCenter,
                });
            }
        }
        return [...buckets.values()];
    };
    const syncVisibleMarkers = (map) => {
        if (animationRunningRef.current || activeAnimationRef.current.tour) {
            return;
        }
        const visibleBuckets = getVisibleBuckets(map);
        const desiredMarkerIds = new Set(visibleBuckets.map((bucket) => bucket.tour.id));
        for (const [markerId, marker] of Object.entries(markerLookupRef.current)) {
            if (!desiredMarkerIds.has(markerId)) {
                marker.remove();
                delete markerLookupRef.current[markerId];
            }
        }
        for (const bucket of visibleBuckets) {
            createMarker(bucket.tour, map, markerLookupRef.current, () => {
                cleanUp(map);
            }, onTourClickRef.current);
        }
    };
    const frame = (time) => {
        const map = mapRef.current;
        const activeAnimation = activeAnimationRef.current;
        if (!map ||
            !activeAnimation.path ||
            !activeAnimation.tour ||
            !activeAnimation.marker ||
            !activeAnimation.popup) {
            return;
        }
        if (!activeAnimation.startTime) {
            activeAnimation.startTime = time;
        }
        const animationPhase = (time - activeAnimation.startTime) / ANIMATION_DURATION;
        if (animationPhase > 1) {
            animationRunningRef.current = false;
            setIsAnimating(false);
            setCanZoomOut(true);
            activeAnimation.frameId = null;
            return;
        }
        const alongPath = along(activeAnimation.path, activeAnimation.pathDistance * animationPhase).geometry.coordinates;
        const lngLat = { lng: alongPath[0], lat: alongPath[1] };
        const bounds = map.getBounds();
        if (bounds && !bounds.contains([lngLat.lng, lngLat.lat])) {
            const now = performance.now();
            if (now - lastAutoRefitRef.current >= AUTO_REFIT_COOLDOWN) {
                lastAutoRefitRef.current = now;
                map.easeTo({
                    center: [lngLat.lng, lngLat.lat],
                    zoom: Math.max(map.getZoom() - 1.5, HOME_ZOOM),
                    pitch: map.getPitch(),
                    bearing: map.getBearing(),
                    duration: 700,
                    essential: true,
                });
            }
        }
        const elevation = Math.floor(map.queryTerrainElevation(lngLat, { exaggerated: false }) ?? 0);
        activeAnimation.marker.setLngLat(lngLat);
        syncPopupToMarker(activeAnimation.popup, activeAnimation.marker);
        updatePopup(activeAnimation.tour, activeAnimation.popup, elevation);
        const lineLayerId = `line-${activeAnimation.tour.id}`;
        if (map.getLayer(lineLayerId)) {
            map.setPaintProperty(lineLayerId, "line-gradient", [
                "step",
                ["line-progress"],
                "#ffcc00",
                animationPhase,
                "rgba(255, 0, 0, 0)",
            ]);
        }
        const rotation = 150 - animationPhase * 40;
        map.setBearing(rotation % 360);
        activeAnimation.frameId = window.requestAnimationFrame(frame);
    };
    const zoomIn = async () => {
        const map = mapRef.current;
        if (!map) {
            return;
        }
        if (!selectedTour) {
            syncVisibleMarkers(map);
            return;
        }
        const tour = selectedTour;
        let marker = selectedTour.marker;
        let popup = selectedTour.popup;
        cleanUp(map);
        setStatusMessage(null);
        animationRunningRef.current = true;
        setIsAnimating(true);
        await new Promise((resolve) => {
            window.requestAnimationFrame(() => {
                map.resize();
                resolve();
            });
        });
        if (!marker) {
            const tourSummary = getTourSummaryFromBundle(tour);
            marker =
                markerLookupRef.current[tour.id] ||
                    createMarker(tourSummary, map, markerLookupRef.current, () => {
                        cleanUp(map);
                    }, onTourClickRef.current);
        }
        if (!popup) {
            popup = new mapboxgl.Popup({
                closeButton: false,
                anchor: "bottom",
                offset: [0, -28],
            }).setLngLat(tour.geo.main.map(Number));
            activeAnimationRef.current.popup = popup;
        }
        syncPopupToMarker(popup, marker);
        updatePopup(tour, popup);
        popup.addTo(map);
        try {
            const geometry = tour?.geo?.geometry;
            if (!geometry) {
                throw new Error(`Tour ${tour.id} did not return geometry data.`);
            }
            const coordinatePairs = parseGeometry(geometry);
            if (coordinatePairs.length < 2) {
                throw new Error(`Tour ${tour.id} geometry is incomplete.`);
            }
            const farthestPointPair = getFarthestPointPair(coordinatePairs);
            const animationCamera = getAnimationCamera(map, farthestPointPair);
            const path = lineString(coordinatePairs);
            const sourceId = `line-${tour.id}`;
            if (map.getLayer(sourceId)) {
                map.removeLayer(sourceId);
            }
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
            map.addSource(sourceId, {
                type: "geojson",
                lineMetrics: true,
                data: {
                    type: "FeatureCollection",
                    features: [path],
                },
            });
            map.addLayer({
                type: "line",
                source: sourceId,
                id: sourceId,
                paint: {
                    "line-color": "rgba(0,0,0,0)",
                    "line-width": 5,
                },
                layout: {
                    "line-cap": "round",
                    "line-join": "round",
                },
            });
            map.flyTo({
                center: animationCamera.center,
                zoom: animationCamera.zoom,
                pitch: ANIMATION_PITCH,
                bearing: ANIMATION_BEARING,
                essential: true,
            });
            await map.once("moveend");
            await map.once("idle");
            activeAnimationRef.current = {
                startTime: null,
                tour,
                path,
                pathDistance: length(path),
                marker,
                popup,
                frameId: window.requestAnimationFrame(frame),
            };
        }
        catch (error) {
            animationRunningRef.current = false;
            setIsAnimating(false);
            setCanZoomOut(true);
            setStatusMessage(error instanceof Error
                ? error.message
                : "Could not load the selected route.");
            syncVisibleMarkers(map);
        }
    };
    // trigger when tour is selected
    useEffect(() => {
        if (selectedTour) {
            void zoomIn();
        }
        else {
            const map = mapRef.current;
            if (map) {
                cleanUp(map);
                syncVisibleMarkers(map);
            }
        }
    }, [selectedTour]);
    useEffect(() => {
        const map = mapRef.current;
        if (!map || selectedTour) {
            return;
        }
        syncVisibleMarkers(map);
    }, [selectedTour, tours]);
    const handleZoomOut = () => {
        const map = mapRef.current;
        if (!map) {
            return;
        }
        map.once("moveend", () => {
            syncVisibleMarkers(map);
        });
        map.flyTo({
            zoom: HOME_ZOOM,
            center: HOME_CENTER,
            pitch: 0,
            bearing: 0,
        });
        cleanUp(map);
        setStatusMessage(null);
    };
    useEffect(() => {
        if (!mapContainerRef.current) {
            return;
        }
        if (!MAPBOX_ACCESS_TOKEN) {
            setStatusMessage("Set VITE_MAPBOX_ACCESS_TOKEN to enable the 3D tour map.");
            return;
        }
        let cancelled = false;
        let resizeObserver = null;
        const initialize = async () => {
            const container = mapContainerRef.current;
            const map = new mapboxgl.Map({
                container,
                accessToken: MAPBOX_ACCESS_TOKEN,
                zoom: HOME_ZOOM,
                center: HOME_CENTER,
                style: "mapbox://styles/mapbox/satellite-streets-v11",
                interactive: true,
                hash: false,
            });
            mapRef.current = map;
            try {
                await map.once("load");
                if (cancelled) {
                    return;
                }
                setStatusMessage(null);
                map.setFog({
                    range: [-0.5, 4],
                    color: "white",
                    "horizon-blend": 0.2,
                });
                map.addLayer({
                    id: "sky",
                    type: "sky",
                    paint: {
                        "sky-type": "atmosphere",
                        "sky-atmosphere-color": "rgba(85, 151, 210, 0.5)",
                    },
                });
                map.addSource("mapbox-dem", {
                    type: "raster-dem",
                    url: "mapbox://mapbox.terrain-rgb",
                    tileSize: 512,
                    maxzoom: 14,
                });
                map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
                await map.once("idle");
                resizeObserver = new ResizeObserver(() => {
                    map.resize();
                });
                resizeObserver.observe(container);
                const refreshMarkers = () => {
                    syncVisibleMarkers(map);
                };
                refreshMarkers();
                map.on("moveend", refreshMarkers);
                map.on("zoomend", refreshMarkers);
            }
            catch (error) {
                if (!cancelled) {
                    setStatusMessage(error instanceof Error
                        ? error.message
                        : "Could not initialize the map.");
                }
            }
        };
        void initialize();
        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            cleanUp(mapRef.current);
            Object.values(markerLookupRef.current).forEach((marker) => marker.remove());
            mapRef.current?.remove();
            mapRef.current = null;
            markerLookupRef.current = {};
        };
    }, []);
    return (_jsxs("div", { className: "h-full w-full", children: [_jsx("div", { ref: mapContainerRef, id: "map", className: `h-full w-full ${isAnimating ? "cursor-progress" : "cursor-pointer"}` }), _jsx("button", { id: "zoomOut", className: "cursor-pointer absolute top-4 left-4 z-50 px-4 py-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-sm rounded-full border border-slate-700/50 hover:bg-slate-800 transition-colors", type: "button", onClick: handleZoomOut, children: "Zoom Out" }), statusMessage ? (_jsx("div", { className: "rounded px-3 py-1 text-sm bg-slate-900/80 backdrop-blur-sm text-slate-300 absolute top-4 right-4 z-10", children: statusMessage })) : null] }));
}
function createMarker(tour, map, markerLookup, onBeforeZoom, onZoom) {
    const key = tour.id;
    const existingMarker = markerLookup[key];
    if (existingMarker) {
        return existingMarker;
    }
    const popup = new mapboxgl.Popup({
        closeButton: false,
        anchor: "bottom",
        offset: [0, -28],
    });
    const marker = new mapboxgl.Marker({
        color: "green",
        scale: 0.8,
        draggable: false,
        pitchAlignment: "auto",
        rotationAlignment: "auto",
    })
        .setPopup(popup)
        .setLngLat(tour.coordinates.map(Number))
        .addTo(map);
    marker.getElement().addEventListener("click", () => {
        onBeforeZoom();
        const tourBundle = {
            id: tour.id,
            marker,
            popup,
        };
        void onZoom(tourBundle);
    });
    markerLookup[key] = marker;
    return marker;
}
//# sourceMappingURL=MapView.js.map