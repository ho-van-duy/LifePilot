// Authentication Check
if (!localStorage.getItem('lifepilot_user_name') || !localStorage.getItem('lifepilot_user_role')) {
    window.location.href = '../../Login/index.html';
}

// --- Utils ---
function getWeekId(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay() || 7; // Get current day number, converting Sun(0) to 7
    if (day !== 1) d.setDate(d.getDate() - (day - 1)); // Set to previous Monday
    return d;
}

function getLocalDateStr(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function getGreeting() {
    const hour = new Date().getHours();
    const savedName = localStorage.getItem('lifepilot_user_name') || 'User';
    
    if (hour >= 0 && hour < 10) {
        return `Good morning, ${savedName}`;
    } else if (hour >= 10 && hour < 13) {
        return `Good noon, ${savedName}`;
    } else if (hour >= 13 && hour < 18) {
        return `Good afternoon, ${savedName}`;
    } else if (hour >= 18 && hour < 21) {
        return `Good evening, ${savedName}`;
    } else {
        return `Good night, ${savedName}`;
    }
}

function getDisplayWeekNumber(date) {
    let startDateStr = localStorage.getItem('lifepilot_start_date');
    if (!startDateStr) {
        const start = getStartOfWeek(new Date());
        startDateStr = getLocalDateStr(start);
        localStorage.setItem('lifepilot_start_date', startDateStr);
    }
    
    const startParts = startDateStr.split('-');
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    
    const targetStart = getStartOfWeek(date);
    const targetDate = new Date(targetStart.getFullYear(), targetStart.getMonth(), targetStart.getDate());
    
    const diffTime = targetDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
    const diffWeeks = Math.floor(diffDays / 7);
    
    return Math.max(0, diffWeeks + 1);
}

// --- Storage Service ---
const storage = {
    getData: () => {
        const data = localStorage.getItem('clarity_planner_data');
        return data ? JSON.parse(data) : {};
    },
    saveData: (data) => {
        localStorage.setItem('clarity_planner_data', JSON.stringify(data));
    },
    getWeek: (weekId) => {
        const data = storage.getData();
        if (!data[weekId]) {
            // Initialize empty week structure
            data[weekId] = {
                goals: { main: [] },
                reflection: { q1: '', q2: '', q3: '', q4: '' },
                days: {} // Date strings "YYYY-MM-DD" as keys
            };
            storage.saveData(data);
        } else {
            // Migrate old structure to new structure if needed
            let migrated = false;
            if (data[weekId].goals && data[weekId].goals.priority !== undefined) {
                const pGoals = data[weekId].goals.priority || [];
                const rGoals = data[weekId].goals.regular || [];
                data[weekId].goals = { main: [...pGoals, ...rGoals] };
                migrated = true;
            }
            if (data[weekId].days) {
                for (const d in data[weekId].days) {
                    const dayData = data[weekId].days[d];
                    if (dayData.tasks) {
                        // Migrate away from tasks to q1/reflection
                        const noteStr = dayData.note || '';
                        delete dayData.tasks;
                        delete dayData.note;
                        dayData.q1 = '';
                        dayData.reflection = noteStr;
                        dayData.detailedTasks = [];
                        migrated = true;
                    }
                    if (!dayData.detailedTasks) {
                        dayData.detailedTasks = [];
                        migrated = true;
                    }
                }
            }
            if (migrated) storage.saveData(data);
        }
        return data[weekId];
    },
    updateWeek: (weekId, weekData) => {
        const data = storage.getData();
        data[weekId] = weekData;
        storage.saveData(data);
    }
};

// --- State ---
const _now = new Date();
let currentDate = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
let calendarDisplayDate = new Date(currentDate);
let donutChart = null;

// --- Calendar Logic ---
function renderCalendar() {
    const monthYearEl = document.getElementById('calendar-month-year');
    const datesEl = document.getElementById('calendar-dates');
    
    const year = calendarDisplayDate.getFullYear();
    const month = calendarDisplayDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthYearEl.innerText = `${monthNames[month]} ${year}`;
    
    datesEl.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get the start and end of the current active week
    const currentWeekStart = getStartOfWeek(currentDate);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    
    // Fill empty slots before 1st of month
    // Shift so Monday is 0 and Sunday is 6
    const emptySlots = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < emptySlots; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-date empty';
        datesEl.appendChild(emptyDiv);
    }
    
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'cal-date';
        dateDiv.innerText = i;
        
        const loopDate = new Date(year, month, i);
        
        const todayReal = new Date();
        const systemToday = new Date(todayReal.getFullYear(), todayReal.getMonth(), todayReal.getDate());
        if (loopDate.getTime() === systemToday.getTime()) {
            dateDiv.classList.add('is-today');
        }
        
        // Highlight active date
        if (loopDate.getTime() === currentDate.getTime()) {
            dateDiv.classList.add('active');
        }
        
        // Highlight the entire active week
        if (loopDate >= currentWeekStart && loopDate <= currentWeekEnd) {
            dateDiv.classList.add('in-week');
        }
        
        dateDiv.addEventListener('click', () => {
            currentDate = new Date(year, month, i);
            renderApp();
        });
        
        datesEl.appendChild(dateDiv);
    }
}

// --- Rendering ---
function renderApp() {
    const startOfWeek = getStartOfWeek(currentDate);
    currentWeekId = getWeekId(startOfWeek);
    
    // Sync calendar display to match currentDate
    calendarDisplayDate = new Date(currentDate);
    renderCalendar();
    
    // Update Title with Greeting
    document.getElementById('week-title').innerText = getGreeting();
    document.getElementById('week-label').innerText = `Week ${getDisplayWeekNumber(currentDate)}`;

    const weekData = storage.getWeek(currentWeekId);
    
    // Initialize days if empty
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const datesOfWeek = [];
    
    for(let i=0; i<7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dStr = getLocalDateStr(d);
        datesOfWeek.push({ name: dayNames[i], date: dStr });
        
        if (!weekData.days[dStr]) {
            weekData.days[dStr] = {
                q1: '',
                reflection: '',
                detailedTasks: []
            };
        } else if (!weekData.days[dStr].detailedTasks) {
            weekData.days[dStr].detailedTasks = [];
        }
    }
    
    // Auto-save any initialization
    storage.updateWeek(currentWeekId, weekData);

    renderGoals(weekData);
    renderReflection(weekData);
    renderDays(datesOfWeek, weekData);
    calculateProgress(weekData, datesOfWeek);
}

function calculateProgress(weekData, datesOfWeek) {
    let wCompleted = 0;
    let wTotal = 0;

    // Count Detailed Tasks in current week
    datesOfWeek.forEach(day => {
        const dayData = weekData.days[day.date];
        if (dayData && dayData.detailedTasks) {
            dayData.detailedTasks.forEach(t => { wTotal++; if(t.completed) wCompleted++; });
        }
    });

    const wPercent = wTotal === 0 ? 0 : Math.round((wCompleted / wTotal) * 100);
    const wInProgress = wTotal - wCompleted;

    // Update Weekly Stats
    const statComp = document.getElementById('stat-comp');
    if (statComp) statComp.innerText = wCompleted;
    const statProg = document.getElementById('stat-prog');
    if (statProg) statProg.innerText = wInProgress;
    const statTot = document.getElementById('stat-tot');
    if (statTot) statTot.innerText = wTotal;
    const weeklyPerc = document.getElementById('weekly-percent');
    if (weeklyPerc) weeklyPerc.innerText = `${wPercent}%`;

    // Render Weekly Donut via CSS
    const wContainer = document.querySelector('.weekly-overview-grid .donut-container');
    if (wContainer) {
        wContainer.style.setProperty('--pct', `${wPercent}%`);
        wContainer.style.setProperty('--chart-color', 'var(--accent-primary)');
    }
}

function renderGoals(weekData) {
    const mList = document.getElementById('goals-main-list');
    if (!mList) return;
    
    mList.innerHTML = '';
    if (weekData.goals.main) {
        weekData.goals.main.forEach(g => {
            mList.appendChild(createGoalItem(g));
        });
    }
}

function renderReflection(weekData) {
    document.getElementById('ref-q1').value = weekData.reflection.q1 || '';
    document.getElementById('ref-q2').value = weekData.reflection.q2 || '';
    document.getElementById('ref-q3').value = weekData.reflection.q3 || '';
    document.getElementById('ref-q4').value = weekData.reflection.q4 || '';
}

function renderDays(datesOfWeek, weekData) {
    const grid = document.getElementById('daily-grid');
    grid.innerHTML = '';

    datesOfWeek.forEach(day => {
        const dayData = weekData.days[day.date];
        const dayStrDisplay = day.date.split('-').slice(1).join('/'); // MM/DD
        
        let dComp = 0;
        let dTot = 0;
        if (dayData.detailedTasks) {
            dayData.detailedTasks.forEach(t => {
                dTot++;
                if (t.completed) dComp++;
            });
        }
        const dPerc = dTot === 0 ? 0 : Math.round((dComp / dTot) * 100);
        
        const card = document.createElement('div');
        card.className = 'day-card';
        
        // Layout with 2 Textareas and Progress Bar
        card.innerHTML = `
            <div class="day-header">
                ${day.name}
                <span>${dayStrDisplay}</span>
            </div>
            <div class="day-chart">
                <div class="bar-text">${dPerc}%</div>
                <div class="bar-fill" style="height: ${dPerc}%;"></div>
            </div>
            <div class="day-boxes">
                <div class="day-box">
                    <textarea placeholder="Mục tiêu quan trọng nhất hôm nay?" data-type="q1" data-date="${day.date}" style="height: 100%; min-height: 90px;">${dayData.q1 || ''}</textarea>
                </div>
                <div class="day-box">
                    <textarea placeholder="Ngày hôm nay của bạn thế nào?" data-type="reflection" data-date="${day.date}" style="height: 100%; min-height: 90px;">${dayData.reflection || ''}</textarea>
                </div>
            </div>`;
        
        // Add click to open daily view
        card.addEventListener('click', (e) => {
            if(e.target.tagName !== 'TEXTAREA') {
                renderDailyView(day.date);
            }
        });

        grid.appendChild(card);
    });

    // Attach Textarea events
    document.querySelectorAll('.day-box textarea').forEach(txt => {
        txt.addEventListener('change', (e) => {
            // Only update if in weekly view
            if (!document.getElementById('view-weekly').classList.contains('active')) return;
            const date = e.target.getAttribute('data-date');
            const type = e.target.getAttribute('data-type');
            weekData.days[date][type] = e.target.value;
            storage.updateWeek(currentWeekId, weekData);
        });
    });
}

let currentDailyDate = null;

function renderDailyView(dateStr) {
    currentDailyDate = dateStr;
    const weekData = storage.getWeek(currentWeekId);
    const dayData = weekData.days[dateStr];
    
    // Switch Views
    document.getElementById('view-weekly').classList.remove('active');
    document.getElementById('view-daily').classList.add('active');
    
    // Header
    const dObj = new Date(dateStr);
    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    document.getElementById('daily-view-title').innerText = `${daysArr[dObj.getDay()]} ${dateStr.split('-').slice(1).join('/')}`;
    
    // Texts
    const q1Input = document.getElementById('daily-q1');
    const refInput = document.getElementById('daily-reflection');
    q1Input.value = dayData.q1 || '';
    refInput.value = dayData.reflection || '';
    
    // Render Tasks
    renderDetailedTasks();
}

function renderDetailedTasks() {
    if (!currentDailyDate) return;
    const weekData = storage.getWeek(currentWeekId);
    const dayData = weekData.days[currentDailyDate];
    
    const list = document.getElementById('detailed-task-list');
    list.innerHTML = '';
    
    let dComp = 0;
    let dTot = 0;
    
    if (dayData.detailedTasks) {
        // Sort by time
        dayData.detailedTasks.sort((a,b) => (a.time || '').localeCompare(b.time || ''));
        
        dayData.detailedTasks.forEach(t => {
            dTot++;
            if (t.completed) dComp++;
            
            const div = document.createElement('div');
            div.className = `detailed-item ${t.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <input type="checkbox" ${t.completed ? 'checked' : ''}>
                <span class="task-time">${t.time || '--:--'}</span>
                <span class="task-text">${t.text}</span>
                <button class="btn-delete-item">×</button>
            `;
            
            div.querySelector('input').addEventListener('change', (e) => {
                t.completed = e.target.checked;
                storage.updateWeek(currentWeekId, weekData);
                renderDetailedTasks();
                
                // Re-calculate weekly progress
                const startOfWeek = getStartOfWeek(currentDate);
                const datesOfWeek = [];
                for(let i=0; i<7; i++) {
                    const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
                    datesOfWeek.push({ date: getLocalDateStr(d) });
                }
                calculateProgress(weekData, datesOfWeek);
            });
            div.querySelector('.btn-delete-item').addEventListener('click', () => {
                dayData.detailedTasks = dayData.detailedTasks.filter(task => task.id !== t.id);
                storage.updateWeek(currentWeekId, weekData);
                renderDetailedTasks();
                
                // Re-calculate weekly progress
                const startOfWeek = getStartOfWeek(currentDate);
                const datesOfWeek = [];
                for(let i=0; i<7; i++) {
                    const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
                    datesOfWeek.push({ date: getLocalDateStr(d) });
                }
                calculateProgress(weekData, datesOfWeek);
            });
            list.appendChild(div);
        });
    }
    
    // Update Daily Progress
    const dPerc = dTot === 0 ? 0 : Math.round((dComp / dTot) * 100);
    document.getElementById('daily-stat-comp').innerText = dComp;
    document.getElementById('daily-stat-tot').innerText = dTot;
    document.getElementById('daily-percent').innerText = `${dPerc}%`;
    
    // Render Daily Donut via CSS
    const dContainer = document.querySelector('.daily-stats-panel .donut-container');
    if (dContainer) {
        dContainer.style.setProperty('--pct', `${dPerc}%`);
        dContainer.style.setProperty('--chart-color', 'var(--accent-primary)');
    }
}

function createGoalItem(item) {
    const div = document.createElement('div');
    div.className = `goal-item`;
    
    div.innerHTML = `
        <span>${item.text}</span>
        <button class="btn-delete-item">×</button>
    `;
    
    div.querySelector('.btn-delete-item').addEventListener('click', () => {
        const weekData = storage.getWeek(currentWeekId);
        weekData.goals.main = weekData.goals.main.filter(g => g.id !== item.id);
        storage.updateWeek(currentWeekId, weekData);
        renderApp();
    });
    
    return div;
}

// --- Event Handlers ---
function handleAddGoal(e, type) {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const weekData = storage.getWeek(currentWeekId);
        weekData.goals[type].push({ id: generateId(), text: e.target.value.trim() });
        storage.updateWeek(currentWeekId, weekData);
        e.target.value = '';
        renderApp();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    
    toggleBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('expanded');
        }
    });

    // Calendar Navigation
    document.getElementById('cal-prev').addEventListener('click', () => {
        calendarDisplayDate.setMonth(calendarDisplayDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('cal-next').addEventListener('click', () => {
        calendarDisplayDate.setMonth(calendarDisplayDate.getMonth() + 1);
        renderCalendar();
    });

    // Add Goal Events
    const addMainGoal = document.getElementById('add-goal-main');
    if (addMainGoal) {
        addMainGoal.addEventListener('keypress', (e) => handleAddGoal(e, 'main'));
    }

    // Reflection Events
    ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        document.getElementById(`ref-${q}`).addEventListener('change', (e) => {
            const weekData = storage.getWeek(currentWeekId);
            weekData.reflection[q] = e.target.value;
            storage.updateWeek(currentWeekId, weekData);
        });
    });

    // Navigation Events
    // Weekly navigation
    const btnPrevWeek = document.getElementById('btn-prev-week');
    if (btnPrevWeek) {
        btnPrevWeek.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 7);
            calendarDisplayDate = new Date(currentDate);
            renderApp();
        });
    }
    
    const btnNextWeek = document.getElementById('btn-next-week');
    if (btnNextWeek) {
        btnNextWeek.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 7);
            calendarDisplayDate = new Date(currentDate);
            renderApp();
        });
    }
    
    const btnCurrentWeek = document.getElementById('btn-current-week');
    if (btnCurrentWeek) {
        btnCurrentWeek.addEventListener('click', () => {
            currentDate = new Date();
            calendarDisplayDate = new Date();
            renderApp();
        });
    }

    // Add Goal Listener
    const addGoalMain = document.getElementById('add-goal-main');
    if (addGoalMain) {
        addGoalMain.addEventListener('keypress', (e) => handleAddGoal(e, 'main'));
    }

    // --- Daily View Listeners ---
    const btnBackWeekly = document.getElementById('btn-back-weekly');
    if (btnBackWeekly) {
        btnBackWeekly.addEventListener('click', () => {
            document.getElementById('view-daily').classList.remove('active');
            document.getElementById('view-weekly').classList.add('active');
            renderApp();
        });
    }

    const btnAddTask = document.getElementById('btn-add-task');
    if (btnAddTask) {
        btnAddTask.addEventListener('click', () => {
            const timeInput = document.getElementById('add-task-time');
            const textInput = document.getElementById('add-task-text');
            if (textInput.value.trim() !== '' && currentDailyDate) {
                // Ensure a time is input, if not, give a default like 12:00 or current time, or just let it be empty.
                const timeVal = timeInput.value || '12:00';
                
                const weekData = storage.getWeek(currentWeekId);
                if (!weekData.days[currentDailyDate].detailedTasks) {
                    weekData.days[currentDailyDate].detailedTasks = [];
                }
                weekData.days[currentDailyDate].detailedTasks.push({
                    id: generateId(),
                    time: timeVal,
                    text: textInput.value.trim(),
                    completed: false
                });
                storage.updateWeek(currentWeekId, weekData);
                timeInput.value = '06:00';
                textInput.value = '';
                renderDetailedTasks();
                
                // Re-calculate weekly progress
                const startOfWeek = getStartOfWeek(currentDate);
                const datesOfWeek = [];
                for(let i=0; i<7; i++) {
                    const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
                    datesOfWeek.push({ date: getLocalDateStr(d) });
                }
                calculateProgress(weekData, datesOfWeek);
            }
        });
    }

    const addTaskText = document.getElementById('add-task-text');
    if (addTaskText) {
        addTaskText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-add-task').click();
        });
    }

    // Handle daily texts change
    document.querySelectorAll('#view-daily textarea').forEach(txt => {
        txt.addEventListener('change', (e) => {
            if (!currentDailyDate) return;
            const weekData = storage.getWeek(currentWeekId);
            const type = e.target.id === 'daily-q1' ? 'q1' : 'reflection';
            weekData.days[currentDailyDate][type] = e.target.value;
            storage.updateWeek(currentWeekId, weekData);
        });
    });

    // Display user name from Login page
    const topbarUserName = document.getElementById('topbar-user-name');
    if (topbarUserName) {
        const savedName = localStorage.getItem('lifepilot_user_name') || 'User';
        topbarUserName.innerText = savedName;
        
        const avatarEl = document.querySelector('.user-profile .avatar');
        if (avatarEl) {
            avatarEl.innerText = savedName.charAt(0);
        }
    }

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const sunIcon = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

    // Check saved theme
    if (localStorage.getItem('lifepilot_theme') === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.innerHTML = moonIcon;
    }

    if (themeToggleBtn && themeIcon) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            if (document.body.classList.contains('light-theme')) {
                themeIcon.innerHTML = moonIcon;
                localStorage.setItem('lifepilot_theme', 'light');
            } else {
                themeIcon.innerHTML = sunIcon;
                localStorage.setItem('lifepilot_theme', 'dark');
            }
        });
    }

    renderApp();
});
