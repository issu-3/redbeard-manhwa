const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const res = await client.query(`
    SELECT * FROM "chapter_images"
    WHERE "chapterId" = 'cmutjrr3c000004lbib5h9mo3'
    ORDER BY "pageNumber" ASC
    LIMIT 2
  `);
  
  console.log('ChapterImages:');
  for (const row of res.rows) {
    console.log(row);
  }
  
  await client.end();
}
main();
