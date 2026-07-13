import "@/index.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { type TourBundle, type TourDetailData } from "../../types/Tour.js";

import { useEffect, useRef, useState } from "react";
import { useDisplayMode, useViewState } from "skybridge/web";

import { useCallTool, useToolInfo } from "../helpers.js";

import { TourDetail } from "./components/TourDetail.js";
import { MapView } from "./components/MapView.js";
import type { TourBundleToFetch } from "../../types/Tour.js";

type HikingViewState = {
  selectedTour: {
    id: string;
    title: string;
    city?: string;
    categories: string[];
  } | null;
};

function HikingTourMap() {
  // Screen info
  const [displayMode, setDisplayMode] = useDisplayMode();
  const isFullscreen = displayMode === "fullscreen";

  const { output, responseMetadata } =
    useToolInfo<"hiking-tour-map">();

  const [selectedTour, setSelectedTour] = useState<TourBundle | null>(null);
  const [viewState, setViewState] = useViewState<HikingViewState>({
    selectedTour: null,
  });
  const allTours = responseMetadata?.allTours || [];
  const toolSelectionRequestRef = useRef(0);

  const { callTool: selectTourForChatGPT } = useCallTool("hiking-tour-map");

  const loadTour = async (tourId: string) => {
    const fetchedTour = await import(
      `../../../assets/tour/${tourId}.json`
    ).then((module) => module.default as TourDetailData);
    const newTourBundle: TourBundle = {
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

      setViewState({
        selectedTour: {
          id: tourBundle.id,
          title: tourBundle.title,
          city: tourBundle.city,
          categories: tourBundle.categories,
        },
      });
    });
  }, [output?.tour?.id, setViewState]);

  const handleTourClick = async (tour: TourBundleToFetch) => {
    const fetchedTour = await loadTour(tour.id);
    const newTourBundle: TourBundle = {
      ...fetchedTour,
      popup: tour.popup,
      marker: tour.marker,
    };

    setSelectedTour(newTourBundle);
    setViewState({
      selectedTour: {
        id: newTourBundle.id,
        title: newTourBundle.title,
        city: newTourBundle.city,
        categories: newTourBundle.categories,
      },
    });
    selectTourForChatGPT({ id: newTourBundle.id });
    setDisplayMode("fullscreen");
  };

  const llmContext = selectedTour
    ? `Selected Austrian hike: ${selectedTour.title}${selectedTour.city ? ` near ${selectedTour.city}` : ""}. Categories: ${selectedTour.categories.join(", ") || "hiking route"}. Tour id: ${selectedTour.id}.`
    : viewState.selectedTour
      ? `Selected Austrian hike: ${viewState.selectedTour.title}. Tour id: ${viewState.selectedTour.id}.`
      : "Browsing the hiking map of Austria. No hike is selected.";

  return (
    <div
      className={`
        bg-slate-950 overflow-hidden transition-all duration-500 ease-out
        ${isFullscreen ? "fixed inset-0 z-50" : "relative h-125 rounded-xl"}
      `}
      data-llm={llmContext}
    >
      <div className="absolute inset-0">
        <MapView
          tours={allTours}
          selectedTour={selectedTour ?? null}
          onTourClick={handleTourClick}
        />
      </div>
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-full sm:w-96 lg:w-[26rem] transition-transform duration-500
          ${isFullscreen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {selectedTour ? <TourDetail tour={selectedTour} /> : null}
      </div>
      {isFullscreen && (
        <button
          type="button"
          onClick={() => setDisplayMode("inline")}
          className="cursor-pointer absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-sm rounded-full border border-slate-700/50 hover:bg-slate-800 transition-colors"
        >
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}

function HikingTourWidget() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HikingTourMap />}>
          <Route path="/:tourId" element={<HikingTourMap />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

export default HikingTourWidget;
