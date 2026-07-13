# Austrian Hiking Map

A ChatGPT app for discovering and inspecting hiking routes across Austria through conversation and an interactive terrain map.

Users can ask ChatGPT for a hike by route name, area, difficulty preference, duration, scenery, or fitness level. The map and conversation share the same selected tour, whether the selection starts in ChatGPT or on the map.

## Requirements

- Node.js 24.14.1 or newer
- A Mapbox public access token

## Local development

```bash
npm ci
cp .env.example web/.env
npm run dev
```

Set `VITE_MAPBOX_ACCESS_TOKEN` in `web/.env`. Skybridge starts the MCP endpoint and local development tools.

## Production build

```bash
npm ci
npm run build
npm start
```

The build output is written to `dist/`. Generated JavaScript and source maps are not committed beside the TypeScript source.

## Deployment

The app is configured for Alpic through [`alpic.json`](./alpic.json).

First deployment:

```bash
npx alpic@latest login
npx alpic@latest deploy --yes --project-name austrian-hiking-map .
```

For later deployments, use:

```bash
npx alpic@latest deploy --yes .
```

Configure `VITE_MAPBOX_ACCESS_TOKEN` in the deployment environment before publishing the app. Vite also reads the local fallback from `web/.env`.

## Submission resources

- Website: https://austrian-hiking-map.glassy-cod-1766.chatgpt.site/
- Privacy policy: https://austrian-hiking-map.glassy-cod-1766.chatgpt.site/privacy
- Terms of service: https://austrian-hiking-map.glassy-cod-1766.chatgpt.site/terms
- Light-mode icon: [`submission-assets/austrian-hiking-map-logo-light.png`](./submission-assets/austrian-hiking-map-logo-light.png)

The website is maintained and deployed independently from the app repository through Sites.
