Used at [https://ships.trade](https://ships.trade).

# ApiForSearch ships example

A small runnable JavaScript example using the `apiforsearch` SDK and six fictional vessels: two cargo ships, two tankers, a yacht, and a ferry. Three vessels also have German variants under the same IDs: **6 IDs, 9 variants**. Each language variant is an explicit object in the `vessels` array, with its own `lang` and the same vessel ID.

## Run

Install [Bun](https://bun.sh), then:

```sh
bun install
cp .env.example .env # Only if you do not already have .env.
```

Set `APIFORSEARCH_TOKEN` in `.env` to a token with **READ+WRITE** permissions, then run:

```sh
bun run start
```

Bun loads `.env` automatically. The SDK discovers the account API URL from the token. Keep `.env` private; it is ignored by Git.

The script writes to the dedicated `ships_demo_test` collection, using IDs 1–6. The collection is created on the first write. Data remains available after the script finishes; rerunning skips existing language variants. Reserve this collection for the example.

## Three searches

1. **Typo tolerance:** `cagro`, filtered to available English cargo ships → Baltic Star and North Trader.
2. **Filters without text:** cargo **OR** tanker, available, price EUR 4–13 million inclusive, length at least 100 m; sorted by ascending price → Baltic Star, North Trader, Aurora.
3. **German search:** `Motoryacht`, filtered to German yacht variants up to 30 m → Sea Breeze, with its German description.

## API details illustrated

- `get(id)` reads saved variants immediately. Only HTTP 404 is treated as absence; authentication and other errors stop the script. Checking search results before inserting would be unreliable because indexing is asynchronous.
- `add()` appends a variant; `replace()` would replace **all** variants for that ID. The script checks `lang` before each insertion, so an interrupted run can add a missing translation. Existing content is not updated.
- This example uses an existence check without optional idempotency keys. Run one copy at a time: the check and insertion are not atomic. If you add idempotency keys for retries, reuse a key only for the same request and collection; otherwise the API returns `409 IDEMPOTENCY_CONFLICT`.
- Translations repeat numeric, boolean, and stable `type` fields because text and filters must match within the same variant. Exact string filters are case-sensitive (except `lang`). Values within one filter array use OR; separate fields use AND.
- Search returns one matching variant per ID, whereas `get()` returns all variants. Sorting uses the first saved variant, so shared numeric fields have the same values in both languages.
- Search indexing is asynchronous. Each example retries missing expected IDs for up to 30 seconds, then fails visibly. Polls consume search requests; a successful rerun normally needs only the three example searches. The SDK does not retry failed API requests automatically.

See [src/ships.js](src/ships.js) for the complete dataset, insertion logic, and queries.
