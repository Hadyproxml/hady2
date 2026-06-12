import { PGlite } from "@electric-sql/pglite";
async function run() {
  const db = new PGlite("./storage-test");
  await db.query("CREATE TABLE test (id integer, name text)");
  await db.query("INSERT INTO test VALUES (1, 'Hello')");
  const res = await db.query("SELECT * FROM test");
  console.log(res.rows);
  process.exit(0);
}
run();
