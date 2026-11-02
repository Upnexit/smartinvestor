import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('scripts/db-schema-dump.json', 'utf8'));

const fks = rawData.constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
const fkMap = {};
for (const fk of fks) {
  if (!fkMap[fk.table_name]) fkMap[fk.table_name] = [];
  fkMap[fk.table_name].push({
    con: fk.constraint_name,
    col: fk.column_name,
    target_table: fk.foreign_table_name,
    target_col: fk.foreign_column_name,
    def: fk.constraint_def
  });
}

console.log(JSON.stringify(fkMap, null, 2));
