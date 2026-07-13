// import "@/index.css";
// import "mapbox-gl/dist/mapbox-gl.css";
export {};
// import bundledTourCollection from "../../../assets/all.json" with { type: "json" };
// import { along, lineString, length } from "@turf/turf";
// import mapboxgl, { type Map as MapboxMap, type Marker, type Popup } from "mapbox-gl";
// import { useEffect, useRef, useState } from "react";
// import { mountWidget, useDisplayMode } from "skybridge/web";
// import { useCallTool, useToolInfo } from "../helpers.js";
// type TourSummary = {
//   id: string;
//   title: string;
//   city?: string;
//   coordinates: [string | number, string | number];
//   geohash: string;
// };
// type BundledTourCollection = {
//   data: {
//     items: Array<{
//       id: string;
//       title: string;
//       city: string | null;
//       coordinates: string[];
//       geohash?: string;
//     }>;
//   };
// };
// type TourDetail = {
//   data?: {
//     geo?: {
//       geometry?: string;
//     };
//   };
// };
// type ActiveAnimation = {
//   startTime: number | null;
//   tour: TourSummary | null;
//   path: ReturnType<typeof lineString> | null;
//   pathDistance: number;
//   marker: Marker | null;
//   popup: Popup | null;
//   frameId: number | null;
// };
// type VisibleBucket = {
//   bucketKey: string;
//   tour: TourSummary;
// };
// type FarthestPointPair = {
//   distanceKm: number;
//   start: [number, number];
//   end: [number, number];
// };
// const HOME_CENTER: [number, number] = [14.633576, 48.250435];
// const HOME_ZOOM = 8;
// const ANIMATION_DURATION = 20000;
// const AUTO_REFIT_COOLDOWN = 900;
// const ANIMATION_PITCH = 56;
// const ANIMATION_BEARING = 150;
// const ANIMATION_PADDING = 72;
// const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";
// const tourDetailLoaders = import.meta.glob("../../../assets/tour/*.json", {
//   import: "default",
// }) as Record<string, () => Promise<TourDetail>>;
// const bundledTours = (bundledTourCollection as BundledTourCollection).data.items.reduce<TourSummary[]>(
//   (result, tour) => {
//     if (tour.coordinates.length < 2) {
//       return result;
//     }
//     result.push({
//       id: tour.id,
//       title: tour.title,
//       city: tour.city ?? undefined,
//       coordinates: [tour.coordinates[0], tour.coordinates[1]],
//       geohash: tour.geohash ?? tour.id,
//     });
//     return result;
//   },
//   [],
// );
// function getGeohashPrecisionForZoom(zoom: number) {
//   if (zoom < 6) {
//     return 3;
//   }
//   if (zoom < 8) {
//     return 4;
//   }
//   if (zoom < 10) {
//     return 5;
//   }
//   if (zoom < 12) {
//     return 6;
//   }
//   if (zoom < 14) {
//     return 7;
//   }
//   return 8;
// }
// function getDistanceBetweenCoordinates(start: [number, number], end: [number, number]) {
//   const earthRadiusKm = 6371;
//   const latitudeDelta = ((end[1] - start[1]) * Math.PI) / 180;
//   const longitudeDelta = ((end[0] - start[0]) * Math.PI) / 180;
//   const startLatitude = (start[1] * Math.PI) / 180;
//   const endLatitude = (end[1] * Math.PI) / 180;
//   const a =
//     Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
//     Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
//   return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }
// function getFarthestPointPair(coordinatePairs: [number, number][]) {
//   let farthestPair: FarthestPointPair | null = null;
//   for (let startIndex = 0; startIndex < coordinatePairs.length - 1; startIndex += 1) {
//     for (let endIndex = startIndex + 1; endIndex < coordinatePairs.length; endIndex += 1) {
//       const start = coordinatePairs[startIndex];
//       const end = coordinatePairs[endIndex];
//       const distanceKm = getDistanceBetweenCoordinates(start, end);
//       if (!farthestPair || distanceKm > farthestPair.distanceKm) {
//         farthestPair = {
//           distanceKm,
//           start,
//           end,
//         };
//       }
//     }
//   }
//   return farthestPair;
// }
// function getAnimationCamera(map: MapboxMap, farthestPair: FarthestPointPair | null) {
//   if (!farthestPair) {
//     return {
//       center: HOME_CENTER,
//       zoom: 12,
//     };
//   }
//   const center: [number, number] = [
//     (farthestPair.start[0] + farthestPair.end[0]) / 2,
//     (farthestPair.start[1] + farthestPair.end[1]) / 2,
//   ];
//   const camera = map.cameraForBounds([farthestPair.start, farthestPair.end], {
//     padding: {
//       top: ANIMATION_PADDING,
//       right: ANIMATION_PADDING,
//       bottom: ANIMATION_PADDING,
//       left: ANIMATION_PADDING,
//     },
//     pitch: ANIMATION_PITCH,
//     bearing: ANIMATION_BEARING,
//   });
//   return {
//     center,
//     zoom: Math.max(camera?.zoom ?? 12, HOME_ZOOM),
//   };
// }
// function HikingTourMap() {
//     const [displayMode, setDisplayMode] = useDisplayMode();
//   const isFullscreen = displayMode === "fullscreen";
//   const { output, responseMetadata, isPending } =
//     useToolInfo<"hiking-tour-map">();
//   const mapContainerRef = useRef<HTMLDivElement | null>(null);
//   const mapRef = useRef<MapboxMap | null>(null);
//   const markerLookupRef = useRef<Record<string, Marker>>({});
//   const animationRunningRef = useRef(false);
//   const lastAutoRefitRef = useRef(0);
//   const activeAnimationRef = useRef<ActiveAnimation>({
//     startTime: null,
//     tour: null,
//     path: null,
//     pathDistance: 0,
//     marker: null,
//     popup: null,
//     frameId: null,
//   });
//   const [isAnimating, setIsAnimating] = useState(false);
//   const [canZoomOut, setCanZoomOut] = useState(false);
//   const [statusMessage, setStatusMessage] = useState<string | null>(null);
//   const updatePopup = (tour: TourSummary, popup: Popup, elevation?: number) => {
//     const content = document.createElement("div");
//     content.className = "tour-map-popup";
//     const title = document.createElement("strong");
//     title.textContent = tour.title;
//     content.appendChild(title);
//     if (typeof elevation === "number") {
//       const elevationText = document.createElement("div");
//       elevationText.textContent = `Höhe: ${elevation}m`;
//       content.appendChild(elevationText);
//     } else if (tour.city) {
//       const cityText = document.createElement("div");
//       cityText.textContent = tour.city;
//       content.appendChild(cityText);
//     }
//     popup.setDOMContent(content);
//   };
//   const cleanUp = (map: MapboxMap | null) => {
//     const activeAnimation = activeAnimationRef.current;
//     if (activeAnimation.frameId !== null) {
//       window.cancelAnimationFrame(activeAnimation.frameId);
//     }
//     if (activeAnimation.tour) {
//       const layerId = `line-${activeAnimation.tour.id}`;
//       if (map?.getLayer(layerId)) {
//         map.removeLayer(layerId);
//       }
//       if (map?.getSource(layerId)) {
//         map.removeSource(layerId);
//       }
//     }
//     activeAnimation.popup?.remove();
//     activeAnimationRef.current = {
//       startTime: null,
//       tour: null,
//       path: null,
//       pathDistance: 0,
//       marker: null,
//       popup: null,
//       frameId: null,
//     };
//     animationRunningRef.current = false;
//     setIsAnimating(false);
//     setCanZoomOut(false);
//   };
//   const parseGeometry = (geometry: string) => {
//     const coordinates = geometry.split(/\s+/).filter(Boolean);
//     const coordinatePairs: [number, number][] = [];
//     for (let index = 0; index < coordinates.length; index += 2) {
//       const latitude = Number(coordinates[index]);
//       const longitude = Number(coordinates[index + 1]);
//       if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
//         continue;
//       }
//       coordinatePairs.push([longitude, latitude]);
//     }
//     return coordinatePairs;
//   };
//   const loadTourDetail = async (tourId: string) => {
//     const loader = tourDetailLoaders[`../../../assets/tour/${tourId}.json`];
//     if (!loader) {
//       throw new Error(`Missing route geometry for tour ${tourId}.`);
//     }
//     return loader();
//   };
//   const getVisibleBuckets = (map: MapboxMap) => {
//     const bounds = map.getBounds();
//     if (!bounds) {
//       return [] as VisibleBucket[];
//     }
//     const precision = getGeohashPrecisionForZoom(map.getZoom());
//     const buckets = new Map<string, VisibleBucket>();
//     for (const tour of bundledTours) {
//       const [longitude, latitude] = tour.coordinates.map(Number) as [number, number];
//       if (!bounds.contains([longitude, latitude])) {
//         continue;
//       }
//       const bucketKey = tour.geohash.slice(0, precision) || tour.id;
//       if (!buckets.has(bucketKey)) {
//         buckets.set(bucketKey, { bucketKey, tour });
//       }
//     }
//     return [...buckets.values()];
//   };
//   const syncVisibleMarkers = (map: MapboxMap) => {
//     if (animationRunningRef.current || activeAnimationRef.current.tour) {
//       return;
//     }
//     const visibleBuckets = getVisibleBuckets(map);
//     const desiredMarkerIds = new Set(visibleBuckets.map((bucket) => bucket.tour.id));
//     for (const [markerId, marker] of Object.entries(markerLookupRef.current)) {
//       if (!desiredMarkerIds.has(markerId)) {
//         marker.remove();
//         delete markerLookupRef.current[markerId];
//       }
//     }
//     for (const bucket of visibleBuckets) {
//       createMarker(bucket.tour, map, markerLookupRef.current, () => cleanUp(map), handleZoomIn);
//     }
//   };
//   const frame = (time: number) => {
//     const map = mapRef.current;
//     const activeAnimation = activeAnimationRef.current;
//     if (!map || !activeAnimation.path || !activeAnimation.tour || !activeAnimation.marker || !activeAnimation.popup) {
//       return;
//     }
//     if (!activeAnimation.startTime) {
//       activeAnimation.startTime = time;
//     }
//     const animationPhase = (time - activeAnimation.startTime) / ANIMATION_DURATION;
//     if (animationPhase > 1) {
//       animationRunningRef.current = false;
//       setIsAnimating(false);
//       setCanZoomOut(true);
//       activeAnimation.frameId = null;
//       return;
//     }
//     const alongPath = along(activeAnimation.path, activeAnimation.pathDistance * animationPhase).geometry
//       .coordinates as [number, number];
//     const lngLat = { lng: alongPath[0], lat: alongPath[1] };
//     const bounds = map.getBounds();
//     if (bounds && !bounds.contains([lngLat.lng, lngLat.lat])) {
//       const now = performance.now();
//       if (now - lastAutoRefitRef.current >= AUTO_REFIT_COOLDOWN) {
//         lastAutoRefitRef.current = now;
//         map.easeTo({
//           center: [lngLat.lng, lngLat.lat],
//           zoom: Math.max(map.getZoom() - 1.5, HOME_ZOOM),
//           pitch: map.getPitch(),
//           bearing: map.getBearing(),
//           duration: 700,
//           essential: true,
//         });
//       }
//     }
//     const elevation = Math.floor(map.queryTerrainElevation(lngLat, { exaggerated: false }) ?? 0);
//     updatePopup(activeAnimation.tour, activeAnimation.popup, elevation);
//     activeAnimation.marker.setLngLat(lngLat);
//     map.setPaintProperty(`line-${activeAnimation.tour.id}`, "line-gradient", [
//       "step",
//       ["line-progress"],
//       "#ffcc00",
//       animationPhase,
//       "rgba(255, 0, 0, 0)",
//     ]);
//     const rotation = 150 - animationPhase * 40;
//     map.setBearing(rotation % 360);
//     activeAnimation.frameId = window.requestAnimationFrame(frame);
//   };
//   const handleZoomIn = async (tour: TourSummary, marker: Marker, popup: Popup) => {
//     const map = mapRef.current;
//     if (!map) {
//       return;
//     }
//     cleanUp(map);
//     setStatusMessage(null);
//     animationRunningRef.current = true;
//     setIsAnimating(true);
//     setDisplayMode("fullscreen");
//     updatePopup(tour, popup);
//     popup.addTo(map);
//     try {
//       const detail = await loadTourDetail(tour.id);
//       const geometry = detail.data?.geo?.geometry;
//       if (!geometry) {
//         throw new Error(`Tour ${tour.id} did not return geometry data.`);
//       }
//       const coordinatePairs = parseGeometry(geometry);
//       if (coordinatePairs.length < 2) {
//         throw new Error(`Tour ${tour.id} geometry is incomplete.`);
//       }
//       const farthestPointPair = getFarthestPointPair(coordinatePairs);
//       const animationCamera = getAnimationCamera(map, farthestPointPair);
//       const path = lineString(coordinatePairs);
//       const sourceId = `line-${tour.id}`;
//       map.addSource(sourceId, {
//         type: "geojson",
//         lineMetrics: true,
//         data: {
//           type: "FeatureCollection",
//           features: [path],
//         },
//       });
//       map.addLayer({
//         type: "line",
//         source: sourceId,
//         id: sourceId,
//         paint: {
//           "line-color": "rgba(0,0,0,0)",
//           "line-width": 5,
//         },
//         layout: {
//           "line-cap": "round",
//           "line-join": "round",
//         },
//       });
//       map.flyTo({
//         center: animationCamera.center,
//         zoom: animationCamera.zoom,
//         pitch: ANIMATION_PITCH,
//         bearing: ANIMATION_BEARING,
//         essential: true,
//       });
//       await map.once("moveend");
//       await map.once("idle");
//       activeAnimationRef.current = {
//         startTime: null,
//         tour,
//         path,
//         pathDistance: length(path),
//         marker,
//         popup,
//         frameId: window.requestAnimationFrame(frame),
//       };
//     } catch (error) {
//       animationRunningRef.current = false;
//       setIsAnimating(false);
//       setCanZoomOut(true);
//       setStatusMessage(error instanceof Error ? error.message : "Could not load the selected route.");
//       syncVisibleMarkers(map);
//     }
//   };
//   const handleZoomOut = () => {
//     const map = mapRef.current;
//     if (!map) {
//       return;
//     }
//     map.once("moveend", () => {
//       syncVisibleMarkers(map);
//     });
//     map.flyTo({
//       zoom: HOME_ZOOM,
//       center: HOME_CENTER,
//       pitch: 0,
//       bearing: 0,
//     });
//     cleanUp(map);
//     setStatusMessage(null);
//   };
//   useEffect(() => {
//     if (!mapContainerRef.current) {
//       return;
//     }
//     if (!MAPBOX_ACCESS_TOKEN) {
//       setStatusMessage("Set VITE_MAPBOX_ACCESS_TOKEN to enable the 3D tour map.");
//       return;
//     }
//     let cancelled = false;
//     const initialize = async () => {
//       const map = new mapboxgl.Map({
//         container: mapContainerRef.current as HTMLDivElement,
//         accessToken: MAPBOX_ACCESS_TOKEN,
//         zoom: HOME_ZOOM,
//         center: HOME_CENTER,
//         style: "mapbox://styles/mapbox/satellite-streets-v11",
//         interactive: true,
//         hash: false,
//       });
//       mapRef.current = map;
//       try {
//         await map.once("load");
//         if (cancelled) {
//           return;
//         }
//         setStatusMessage(null);
//         map.setFog({
//           range: [-0.5, 4],
//           color: "white",
//           "horizon-blend": 0.2,
//         });
//         map.addLayer({
//           id: "sky",
//           type: "sky",
//           paint: {
//             "sky-type": "atmosphere",
//             "sky-atmosphere-color": "rgba(85, 151, 210, 0.5)",
//           },
//         });
//         map.addSource("mapbox-dem", {
//           type: "raster-dem",
//           url: "mapbox://mapbox.terrain-rgb",
//           tileSize: 512,
//           maxzoom: 14,
//         });
//         map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
//         await map.once("idle");
//         const refreshMarkers = () => {
//           syncVisibleMarkers(map);
//         };
//         refreshMarkers();
//         map.on("moveend", refreshMarkers);
//         map.on("zoomend", refreshMarkers);
//       } catch (error) {
//         if (!cancelled) {
//           setStatusMessage(error instanceof Error ? error.message : "Could not initialize the map.");
//         }
//       }
//     };
//     void initialize();
//     return () => {
//       cancelled = true;
//       cleanUp(mapRef.current);
//       Object.values(markerLookupRef.current).forEach((marker) => marker.remove());
//       mapRef.current?.remove();
//       mapRef.current = null;
//       markerLookupRef.current = {};
//     };
//   }, []);
//   return (
//     <div className="tour-map-shell">
//       <div className="tour-map-stage">
//         <div ref={mapContainerRef} id="map" className={`tour-map-canvas ${isAnimating ? "pointer-none" : ""}`} />
//         <button
//           id="zoomOut"
//           className={`tour-map-zoomout ${canZoomOut ? "is-visible" : ""}`}
//           type="button"
//           onClick={handleZoomOut}
//         >
//           Zurück
//         </button>
//         {statusMessage ? <div className="tour-map-status">{statusMessage}</div> : null}
//       </div>
//     </div>
//   );
// }
// function createMarker(
//   tour: TourSummary,
//   map: MapboxMap,
//   markerLookup: Record<string, Marker>,
//   onBeforeZoom: () => void,
//   onZoom: (tour: TourSummary, marker: Marker, popup: Popup) => Promise<void>,
// ) {
//   const key = tour.id;
//   const existingMarker = markerLookup[key];
//   if (existingMarker) {
//     return existingMarker;
//   }
//   const popup = new mapboxgl.Popup({ closeButton: false });
//   const marker = new mapboxgl.Marker({
//     color: "red",
//     scale: 0.8,
//     draggable: false,
//     pitchAlignment: "auto",
//     rotationAlignment: "auto",
//   })
//     .setPopup(popup)
//     .setLngLat(tour.coordinates.map(Number) as [number, number])
//     .addTo(map);
//   marker.getElement().addEventListener("click", () => {
//     onBeforeZoom();
//     void onZoom(tour, marker, popup);
//   });
//   markerLookup[key] = marker;
//   return marker;
// }
// export default HikingTourMap;
// mountWidget(<HikingTourMap />);
//# sourceMappingURL=hiking-tour-map-old.js.map