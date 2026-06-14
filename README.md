# Clarity Planner

A modern, fullstack web application for tracking weekly goals, daily tasks, and personal reflections. Inspired by high-productivity weekly planners!

## Project Structure

This project follows a standard fullstack architecture:

### `frontend/`
Contains the client-side code (HTML, CSS, JavaScript). It uses pure, modern web standards to maximize performance and flexibility without bulky frameworks, following best aesthetic practices.
- **Styling**: Utilizes CSS variables, glassmorphism, and smooth transitions for a premium dark mode UI.
- **Data Persistence**: Uses `localStorage` to save your weekly plans directly in your browser.
- **Charts**: Integrates `Chart.js` via CDN for beautiful data visualization.
- **To run**: Simply double-click `frontend/index.html` to open it in any modern browser!

### `backend/`
Contains the server-side code structure (Node.js/Express) indicating how the RESTful API would be implemented to handle a true remote database (like MongoDB or PostgreSQL).
- **To run**: You need Node.js installed. Navigate to the `backend` folder, run `npm install`, then run `npm run dev`.

## Features
- **Weekly Overview**: Define Priority and Regular goals for the week.
- **Weekly Reflection**: Answer core questions to improve yourself every week.
- **Daily View**: Break down your days (Monday - Sunday) into priority and regular tasks.
- **Dynamic Charts**: See your completion percentage visually with a weekly Donut Chart and daily Bar Charts!
- **Notes**: Add small notes for each day.
