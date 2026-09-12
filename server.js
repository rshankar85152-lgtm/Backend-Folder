const express = require('express');
const path = require('path');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.send('Mera Backend Server Successfully Start Ho Gya And How are you everyone !');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
