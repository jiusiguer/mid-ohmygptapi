const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const routes = require('./routes');

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', routes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});