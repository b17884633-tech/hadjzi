/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '..', 'sql', '008_refill_availabilities.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const attempts = [
    { label: 'ssl:false', config: { connectionString: url, ssl: false } },
    {
      label: 'ssl:rejectUnauthorized=false',
      config: { connectionString: url, ssl: { rejectUnauthorized: false } },
    },
  ];

  let lastError;
  for (const attempt of attempts) {
    const client = new Client(attempt.config);
    try {
      await client.connect();
      console.log('connected via', attempt.label);
      const result = await client.query(sql);
      const counts = Array.isArray(result)
        ? result.map((r) => r.rowCount)
        : [result.rowCount];
      console.log('statement rowCounts:', counts.join(', '));

      const check = await client.query(
        `SELECT count(*)::int AS n
         FROM service_availabilities
         WHERE date >= CURRENT_DATE`,
      );
      console.log('future availability rows:', check.rows[0].n);

      const byType = await client.query(
        `SELECT c.booking_type::text AS t, count(DISTINCT s.id)::int AS services,
                count(a.id)::int AS slots
         FROM services s
         JOIN categories c ON c.id = s.category_id
         LEFT JOIN service_availabilities a
           ON a.service_id = s.id AND a.date >= CURRENT_DATE
         WHERE s.status = 'ACTIVE'
         GROUP BY c.booking_type
         ORDER BY c.booking_type`,
      );
      console.table(byType.rows);

      await client.end();
      return;
    } catch (err) {
      lastError = err;
      console.log(attempt.label, 'failed:', err.message);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  console.error(lastError);
  process.exit(1);
}

main();
