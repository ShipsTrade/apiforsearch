import { ApiForSearch, ApiForSearchError } from 'apiforsearch';

// Bun loads .env automatically. Use a separate collection for this demo.
const token = process.env.APIFORSEARCH_TOKEN;
if (!token) throw new Error('Set APIFORSEARCH_TOKEN in .env (READ+WRITE).');
const ships = new ApiForSearch(token, 'ships_demo_test');

// Fictional vessels; type is a stable filter value in every language.
const vessels = [
  { id: 1, lang: 'en', name: 'Baltic Star', type: 'cargo', length_m: 120, price_eur: 4200000, available: true,
    description: 'Cargo ship for coastal freight' },
  { id: 1, lang: 'de', name: 'Baltic Star', type: 'cargo', length_m: 120, price_eur: 4200000, available: true,
    description: 'Frachtschiff für Küstentransporte' },
  { id: 2, lang: 'en', name: 'North Trader', type: 'cargo', length_m: 160, price_eur: 7800000, available: true,
    description: 'Cargo ship for ocean freight' },
  { id: 3, lang: 'en', name: 'Aurora', type: 'tanker', length_m: 180, price_eur: 12000000, available: true,
    description: 'Tanker for petroleum transport' },
  { id: 3, lang: 'de', name: 'Aurora', type: 'tanker', length_m: 180, price_eur: 12000000, available: true,
    description: 'Tankschiff für den Transport von Erdöl' },
  { id: 4, lang: 'en', name: 'Coral Energy', type: 'tanker', length_m: 210, price_eur: 19000000, available: false,
    description: 'Tanker for chemical transport' },
  { id: 5, lang: 'en', name: 'Sea Breeze', type: 'yacht', length_m: 28, price_eur: 2100000, available: true,
    description: 'Motor yacht for coastal cruising' },
  { id: 5, lang: 'de', name: 'Sea Breeze', type: 'yacht', length_m: 28, price_eur: 2100000, available: true,
    description: 'Motoryacht für entspannte Küstenfahrten' },
  { id: 6, lang: 'en', name: 'Island Link', type: 'ferry', length_m: 75, price_eur: 3500000, available: true,
    description: 'Passenger ferry for island routes' },
];

async function seed() {
  let added = 0;
  for (const vessel of vessels) {
    let saved;
    try {
      saved = await ships.get(vessel.id); // Reads persisted data, even before indexing.
    } catch (error) {
      if (!(error instanceof ApiForSearchError) || error.status !== 404) throw error;
      saved = [];
    }
    if (saved.some(doc => doc.lang === vessel.lang)) continue;
    // POST appends this explicit language variant under the SAME numeric ID.
    await ships.add(vessel);
    added++;
  }
  console.log(`Added ${added} variants (existing languages skipped).`);
}

const examples = [
  { title: 'Typo: "cagro" + exact type/availability filters', query: 'cagro',
    options: { filters: { type: 'cargo', available: true, lang: 'en' } }, expected: [1, 2] },
  { title: 'Filter only: cargo OR tanker, EUR 4–13M, length >= 100m, cheapest first', query: '',
    options: { filters: { type: ['cargo', 'tanker'], available: true, lang: 'en' },
      from: { price_eur: 4000000, length_m: 100 }, to: { price_eur: 13000000 },
      sort: 'price_eur' }, expected: [1, 2, 3] },
  { title: 'German text + language/type filters + maximum length', query: 'Motoryacht',
    options: { filters: { lang: 'de', type: 'yacht' }, to: { length_m: 30 } }, expected: [5] },
];

async function main() {
  await seed();
  for (const { title, query, options, expected } of examples) {
    // Writes are durable immediately, but search indexing is asynchronous.
    const deadline = Date.now() + 30000;
    let result;
    while (true) {
      result = await ships.search(query, { ...options, limit: 10 });
      if (expected.every(id => result.documents.some(doc => doc.id === id))) break;
      if (Date.now() >= deadline) throw new Error(`Expected IDs ${expected} missing: ${title}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(`\n${title} (${result.total} ships)`);
    console.table(result.documents.map(({ id, name, lang, type, length_m, price_eur, description }) =>
      ({ id, name, lang, type, length_m, price_eur, description })));
  }
}

main().catch(error => {
  console.error(error instanceof ApiForSearchError
    ? `${error.status} ${error.code}: ${error.message}` : error.message);
  process.exitCode = 1;
});
