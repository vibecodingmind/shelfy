# Business directory & Google Places

## Admin workflow

1. **Settings → Platform → Maps** — server Places API key (`GOOGLE_PLACES_API_KEY` or `GOOGLE_MAPS_API_KEY`).
2. **Admin → Business Directory → Directory Settings** — quotas, enable Places API, test connection.
3. **Google Maps Importer** — search by region/category; select results; confirm import.
4. **Claim Requests** — approve owner claims; approval creates a **draft Host shop** linked to the directory record (`ONBOARDING`).

## Data policy

- Shelfy stores **Google Place IDs**, region/city/category, coordinates, and status fields.
- Names, addresses, ratings, and Google photos are fetched via API or short-lived cache — not treated as permanent independent copies.
- **Licensed photos** (owner, field agent) are stored in Shelfy storage with source metadata.

## Public API

- `GET /api/directory/businesses` — filters: `region`, `city`, `category`, `q`, `nearLat`, `nearLng`, `radiusKm`
- `GET /api/directory/businesses/:id` — on-demand Google display + licensed photos
- `POST /api/directory/businesses/:id/claim` — Host/Vendor claim request

## Cost controls

- No Places calls on public list views.
- Admin search rate-limited; daily/monthly quotas in Directory Settings.
