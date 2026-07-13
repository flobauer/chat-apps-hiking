# Austrian Hiking Map

## Value Proposition

Help people explore hikes in Austria inside ChatGPT through a conversational and visual map experience. The app makes it easier to discover, compare, select, and inspect hikes without leaving the conversation.

**Core actions:**

1. Open and browse the Austrian hiking map.
2. Select a hike through ChatGPT or by clicking its map marker.
3. Review the selected hike's route and details in fullscreen mode.

## Why ChatGPT?

ChatGPT lets users describe the hike they want in natural language, including a route name, area, difficulty preference, duration, scenery, or fitness level. It interprets that intent and uses the app's structured hike data to focus the experience.

The app supplies what ChatGPT does not have on its own: the bundled Austrian tour dataset, interactive Mapbox terrain map, route visualization, and visual tour details.

## UI Overview

**First view:** The existing interactive map of Austria opens inline, optionally focused on a hike requested through ChatGPT.

**Map interaction:** The user browses the existing terrain map and clicks a hike marker. The app keeps the current map behavior and fullscreen transition.

**Fullscreen detail:** The selected route animates on the map. The right-side panel presents the hike with clearer hierarchy, spacing, useful route metadata, restrained alpine colors, and a comfortable reading surface. The treatment should feel like a polished hiking app while remaining subtle.

**Shared selection state:** A hike selected through ChatGPT updates the map and detail panel. A hike selected in the frontend updates the context available to ChatGPT. Both directions must resolve to the same selected hike.

## Product Context

- **Existing product:** Functional React web app and MCP server built with Skybridge.
- **Deployment:** Alpic CLI and configuration.
- **Data:** Bundled Austrian tour summary and detail JSON files.
- **Map:** Mapbox terrain map and route animation.
- **Authentication:** None.

## UX Flow

Explore a hike:

1. ChatGPT invokes the hiking map with an optional hike or area name.
2. The user browses the existing map and selects a hike marker, or ChatGPT selects a hike through the widget input.
3. The widget enters fullscreen after a user marker click, keeps the selected route centered, animates it, and shows its details in the right-side panel.
4. The selected hike is stored as widget state and described with concise `data-llm` context so ChatGPT and the frontend refer to the same hike.

## Widget API

**Widget: `hiking-tour-map`**

- **Input:** Optional `{ name }` hike or area query.
- **Structured output:** The hike selected by ChatGPT, when one was requested.
- **Widget-only metadata:** All summarized hikes used to render map markers.
- **Views:** Existing inline Austrian map and fullscreen map with route detail panel.
- **State:** Selected hike identity and useful summary fields persist in widget state. Map animation, marker, popup, and transition state remain ephemeral.
- **Frontend interaction:** Clicking a marker selects that exact hike locally and calls the existing widget tool so the host receives the corresponding structured tool result.

## Change Scope

- Update the project to the latest compatible Alpic changes.
- Improve the fullscreen right-side tour panel without redesigning the app.
- Make hike selection synchronization reliable in both directions between ChatGPT and the frontend.
- Preserve the current map, marker browsing, route animation, fullscreen interaction, and overall architecture.

## Acceptance Criteria

1. The project uses the latest available Alpic CLI integration and builds successfully.
2. The fullscreen right-side panel is visibly more polished and hiking-oriented while remaining restrained.
3. Selecting a hike in ChatGPT updates the frontend's selected hike, map focus, and detail panel.
4. Clicking a hike marker updates the frontend selection and provides ChatGPT with the selected hike and useful details.
5. Existing map browsing, route animation, and fullscreen behavior remain functional.
6. The map and tour selection path retain the behavior from the last known-working version of the app.

## Submission Website

- A separate public website introduces the app without changing the ChatGPT app runtime.
- Dedicated `/privacy` and `/terms` pages provide submission-ready policy URLs.
- The privacy policy states that the app has no accounts, analytics, advertising, or persistent user-data storage, while distinguishing OpenAI and Mapbox processing.
- A `/demo` page is reserved for the final walkthrough recording supplied by the app owner.
- The homepage teaser uses the bundled “Rund um den Gosausee” tour (ID `430000685`), including its real route shape and dataset-derived details.

## Submission Assets

- The light-mode app icon is a square 1024×1024 opaque PNG with no border or rounded corners.
- Its centered alpine route mark remains fully legible when clients crop the square image to a circle.
- The website footer displays smaller original Change Tourism Austria and Austria Tourism logos under “With support from,” using direct static asset paths and links matching the hackathon reference implementation.
