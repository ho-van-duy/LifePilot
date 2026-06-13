const express = require('express');
const cors = require('cors');
const habitRoutes = require('./routes/habits');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/habits', habitRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'HabitFlow API is running. Welcome!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
