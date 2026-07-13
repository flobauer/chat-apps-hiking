import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "@/index.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {} from "../../types/Tour.js";
import { useEffect, useRef, useState } from "react";
import { mountWidget, useDisplayMode } from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";
import { TourDetail } from "./components/TourDetail.js";
import { MapView } from "./components/MapView.js";
const FULLSCREEN_TRANSITION_MS = 500;
function HikingTourMap() {
    // Screen info
    const [displayMode, setDisplayMode] = useDisplayMode();
    const isFullscreen = displayMode === "fullscreen";
    const { output, responseMetadata } = useToolInfo();
    const [selectedTour, setSelectedTour] = useState(null);
    const [pendingTour, setPendingTour] = useState(null);
    const allTours = responseMetadata?.allTours || [];
    const toolSelectionRequestRef = useRef(0);
    const { callTool: travelTo, data, } = useCallTool("hiking-tour-map");
    const loadTour = async (tourId) => {
        const fetchedTour = await import(`../../../assets/tour/${tourId}.json`).then((module) => module.default);
        const newTourBundle = {
            ...fetchedTour.data,
            popup: null,
            marker: null,
        };
        return newTourBundle;
    };
    useEffect(() => {
        if (!output?.tour?.id) {
            return;
        }
        const requestId = toolSelectionRequestRef.current + 1;
        toolSelectionRequestRef.current = requestId;
        void loadTour(output.tour.id).then((tourBundle) => {
            if (toolSelectionRequestRef.current !== requestId) {
                return;
            }
            setSelectedTour((currentTour) => {
                if (currentTour?.id !== tourBundle.id) {
                    return tourBundle;
                }
                return {
                    ...tourBundle,
                    marker: currentTour.marker,
                    popup: currentTour.popup,
                };
            });
        });
    }, [output?.tour?.id]);
    useEffect(() => {
        if (isFullscreen && pendingTour) {
            const pendingSelection = pendingTour;
            const timeoutId = window.setTimeout(() => {
                setSelectedTour(pendingSelection);
                travelTo({ name: pendingSelection.title });
                setPendingTour(null);
            }, FULLSCREEN_TRANSITION_MS);
            return () => {
                window.clearTimeout(timeoutId);
            };
        }
    }, [isFullscreen, pendingTour, travelTo]);
    const tour = (data?.structuredContent.tour || output?.tour);
    const handleTourClick = async (tour) => {
        const fetchedTour = await loadTour(tour.id);
        const newTourBundle = {
            ...fetchedTour,
            popup: tour.popup,
            marker: tour.marker,
        };
        setPendingTour(newTourBundle);
        setDisplayMode("fullscreen");
    };
    return (_jsxs("div", { className: `
        bg-slate-950 overflow-hidden transition-all duration-500 ease-out
        ${isFullscreen ? "fixed inset-0 z-50" : "relative h-125 rounded-xl"}
      `, children: [_jsx("div", { className: "absolute inset-0", children: _jsx(MapView, { tours: allTours, selectedTour: selectedTour ?? null, onTourClick: handleTourClick }) }), _jsx("div", { className: `
          absolute right-0 top-0 bottom-0 w-80 transition-transform duration-500
          ${isFullscreen ? "translate-x-0" : "translate-x-full"}
        `, children: tour ? _jsx(TourDetail, { tour: tour }) : null }), isFullscreen && (_jsx("button", { type: "button", onClick: () => setDisplayMode("inline"), className: "cursor-pointer absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-sm rounded-full border border-slate-700/50 hover:bg-slate-800 transition-colors", children: "Exit Fullscreen" }))] }));
}
function HikingTourWidget() {
    return (_jsx(MemoryRouter, { initialEntries: ["/"], children: _jsx(Routes, { children: _jsx(Route, { path: "/", element: _jsx(HikingTourMap, {}), children: _jsx(Route, { path: "/:tourId", element: _jsx(HikingTourMap, {}) }) }) }) }));
}
export default HikingTourWidget;
mountWidget(_jsx(HikingTourWidget, {}));
//# sourceMappingURL=hiking-tour-map.js.map