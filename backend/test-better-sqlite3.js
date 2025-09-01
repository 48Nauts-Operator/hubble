// Test script for better-sqlite3
const Database = require('better-sqlite3');

async function testDb() {
  try {
    console.log('Opening database...');
    const db = new Database('/data/test-better.db');
    
    console.log('Creating table...');
    db.exec('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
    
    console.log('Inserting data...');
    const insert = db.prepare('INSERT OR IGNORE INTO test_table (id, name) VALUES (?, ?)');
    insert.run(1, 'test');
    
    console.log('Querying data...');
    const select = db.prepare('SELECT * FROM test_table WHERE id = ?');
    const result = select.get(1);
    console.log('Result:', result);
    
    console.log('Closing database...');
    db.close();
    
    console.log('Better SQLite3 test successful!');
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDb();