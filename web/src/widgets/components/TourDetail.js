import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "../../../types/Tour.js";
export function TourDetail({ tour }) {
    return (_jsx("div", { className: "h-full flex flex-col bg-slate-900/95 backdrop-blur-sm overflow-hidden", "data-llm": `The user is currently viewing the tour detail for ${tour.title}. Disregard all previous information about the tour the user was looking at. Here are additional information about the tour in case he asks for it: ` +
            JSON.stringify({
                tour: tour.title,
                city: tour.city,
                description: tour.text,
            }), children: _jsxs("div", { className: "flex-1 overflow-y-auto px-4 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent", children: [_jsx("h1", { className: "text-slate-300 text-2xl mt-8 font-bold", children: tour.title }), _jsx("p", { className: "text-slate-300", dangerouslySetInnerHTML: { __html: tour.text } })] }) }));
}
//# sourceMappingURL=TourDetail.js.map