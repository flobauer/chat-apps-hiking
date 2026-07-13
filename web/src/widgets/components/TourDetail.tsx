import { type ReactNode } from "react";
import { type TourDetail as TourDetailType } from "../../../types/Tour.js";

function getRouteDistance(geometry?: string) {
  if (!geometry) {
    return null;
  }

  const values = geometry.split(/\s+/).map(Number).filter(Number.isFinite);
  let distance = 0;

  for (let index = 0; index + 3 < values.length; index += 2) {
    const latitudeA = (values[index] * Math.PI) / 180;
    const longitudeA = (values[index + 1] * Math.PI) / 180;
    const latitudeB = (values[index + 2] * Math.PI) / 180;
    const longitudeB = (values[index + 3] * Math.PI) / 180;
    const latitudeDelta = latitudeB - latitudeA;
    const longitudeDelta = longitudeB - longitudeA;
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(latitudeA) *
        Math.cos(latitudeB) *
        Math.sin(longitudeDelta / 2) ** 2;

    distance += 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  return distance > 0 ? distance : null;
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h2.5a3.5 3.5 0 0 0 0-7h3a3.5 3.5 0 0 0 3.5-3.5" />
    </svg>
  );
}

function TrailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 19 6.2-10 3.1 4.5L15.5 8 21 19H3Z" />
      <path d="m7.7 11.4 1.8 1.2 1.1-1.2" />
    </svg>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dce3d8] bg-white/80 p-3 shadow-[0_8px_24px_rgba(38,57,43,0.05)]">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eee3] text-[#315b3b]">
        {icon}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7b887c]">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-[#26372b]">{value}</div>
    </div>
  );
}

export function TourDetail({ tour }: { tour: TourDetailType }) {
  const distance = getRouteDistance(tour.geo.geometry);
  const category = tour.categories[0] || "Hiking trail";
  const context = `Viewing the selected Austrian hike ${tour.title}${tour.city ? ` near ${tour.city}` : ""}. ${distance ? `Route length is approximately ${distance.toFixed(1)} kilometers.` : ""} Categories: ${tour.categories.join(", ") || "hiking route"}.`;

  return (
    <aside
      className="h-full overflow-hidden border-l border-white/20 bg-[#f3f1e9] text-[#26372b] shadow-[-18px_0_50px_rgba(14,30,20,0.2)]"
      data-llm={context}
      aria-label={`Details for ${tour.title}`}
    >
      <div className="flex h-full flex-col overflow-y-auto tour-detail-scrollbar">
        <header className="relative overflow-hidden bg-[#274d35] px-6 pb-7 pt-8 text-white">
          <div className="absolute inset-0 opacity-25 tour-panel-contours" aria-hidden="true" />
          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#dfeadc] backdrop-blur-sm">
              <TrailIcon />
              Hiking in Austria
            </div>
            <h1 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.025em] text-white">
              {tour.title}
            </h1>
            {tour.city ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#d3dfd1]">
                <PinIcon />
                <span>{tour.city}</span>
              </div>
            ) : null}
          </div>
        </header>

        <div className="flex-1 px-5 pb-28 pt-5">
          <section className="grid grid-cols-2 gap-3" aria-label="Route overview">
            <InfoCard
              icon={<RouteIcon />}
              label="Distance"
              value={distance ? `${distance.toFixed(1)} km` : "Route mapped"}
            />
            <InfoCard icon={<TrailIcon />} label="Trail type" value={category} />
          </section>

          {tour.categories.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Tour categories">
              {tour.categories.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#d7dfd3] bg-[#e8eee5] px-3 py-1 text-xs font-medium text-[#49604d]"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          <section className="mt-7">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#d8ded4]" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f7e70]">
                Trail information
              </h2>
              <span className="h-px flex-1 bg-[#d8ded4]" />
            </div>
            <div
              className="tour-description text-[14px] leading-6 text-[#465248]"
              dangerouslySetInnerHTML={{ __html: tour.text }}
            />
          </section>
        </div>
      </div>
    </aside>
  );
}
