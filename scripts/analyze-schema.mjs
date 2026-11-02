import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('scripts/db-schema-dump.json', 'utf8'));

// Group columns by table
const tableColumns = {};
for (const col of rawData.columns) {
  if (!tableColumns[col.table_name]) tableColumns[col.table_name] = [];
  tableColumns[col.table_name].push(col);
}

// Group constraints by table
const tableConstraints = {};
for (const con of rawData.constraints) {
  if (!tableConstraints[con.table_name]) tableConstraints[con.table_name] = [];
  tableConstraints[con.table_name].push(con);
}

// Group policies by table
const tablePolicies = {};
for (const pol of rawData.policies) {
  if (!tablePolicies[pol.tablename]) tablePolicies[pol.tablename] = [];
  tablePolicies[pol.tablename].push(pol);
}

// Group indexes by table
const tableIndexes = {};
for (const idx of rawData.indexes) {
  if (!tableIndexes[idx.tablename]) tableIndexes[idx.tablename] = [];
  tableIndexes[idx.tablename].push(idx);
}

// Group triggers by table
const tableTriggers = {};
for (const trg of rawData.triggers) {
  if (!tableTriggers[trg.table_name]) tableTriggers[trg.table_name] = [];
  tableTriggers[trg.table_name].push(trg);
}

console.log('Tables detected:', Object.keys(tableColumns).sort());
