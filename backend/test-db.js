// Minimal SQLite test script
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function testDb() {
  try {
    console.log('Opening database...');
    const db = await open({
      filename: '/data/test-app.db',
      driver: sqlite3.Database
    });
    
    console.log('Creating table...');
    await db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
    
    console.log('Inserting data...');
    await db.run('INSERT OR IGNORE INTO test_table (id, name) VALUES (1, "test")');
    
    console.log('Querying data...');
    const result = await db.get('SELECT * FROM test_table WHERE id = 1');
    console.log('Result:', result);
    
    console.log('Closing database...');
    await db.close();
    
    console.log('Database test successful!');
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDb();