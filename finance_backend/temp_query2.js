const mysql = require('mysql2/promise');

mysql.createConnection({
  host:'tmsdatabase.mysql.database.azure.com',
  user:'tmsdkg',
  password:'Test@123',
  database:'tmsdatabase',
  ssl:{rejectUnauthorized:false}
}).then(async c => {
  const [r] = await c.query("SELECT * FROM customer_commercial LIMIT 5");
  console.log(JSON.stringify(r, null, 2));
  c.end();
}).catch(console.error);
