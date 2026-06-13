const express = require('express');
const router = express.Router();

// Mock database (in a real app, use MongoDB or PostgreSQL)
let habits = [];

// GET all habits
router.get('/', (req, res) => {
    res.json(habits);
});

// POST new habit
router.post('/', (req, res) => {
    const { name } = req.body;
    const newHabit = {
        id: Date.now().toString(),
        name,
        createdAt: new Date().toISOString(),
        history: {},
        streak: 0
    };
    habits.push(newHabit);
    res.status(201).json(newHabit);
});

// PUT toggle habit completion
router.put('/:id/toggle', (req, res) => {
    const { id } = req.params;
    const { date } = req.body; // format: YYYY-MM-DD
    
    const habit = habits.find(h => h.id === id);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    
    habit.history[date] = !habit.history[date];
    
    // Recalculate streak logic would go here
    
    res.json(habit);
});

// DELETE habit
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    habits = habits.filter(h => h.id !== id);
    res.status(204).send();
});

module.exports = router;
