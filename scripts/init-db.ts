import { getDb, persistDb } from '../lib/storage/db';

async function main() {
  await getDb();
  await persistDb();
  console.log('Database initialized at data/trader-notes.sqlite');
}

main();
