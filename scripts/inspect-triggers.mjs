import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('scripts/db-schema-dump.json', 'utf8'));

console.log('Triggers:', JSON.stringify(rawData.triggers, null, 2));
