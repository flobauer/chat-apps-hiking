import { type Marker, type Popup } from "mapbox-gl";

export type TourSummary = {
  id: string;
  title: string;
  city?: string;
  slug: string;
  coordinates: [number, number];
  geohash?: string;
};

export type TourDetailData = {
    data: TourDetail;   
}

export type TourDetail = {
    id: string;
    title: string;
    city?: string;
    categories: string[];
    text: string;
    url?: string;
    geo: {
        geometry?: string;
        main: [string, string];
    };
    ratings: string[];  
};

export type TourBundle= TourDetail & {
    marker: Marker | null;
    popup: Popup | null;
};

export type TourBundleToFetch = {
    id: string;
    marker: Marker;
    popup: Popup;
};