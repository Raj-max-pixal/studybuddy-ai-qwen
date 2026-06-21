// ==========================================
// GLOBALS & STATE
// ==========================================
let activeSubjectId = null;
let currentFlashcardIdx = 0;
let calendarCurrentDate = new Date(); // Year & Month view
let calendarSelectedDateStr = ""; // Selected YYYY-MM-DD
let activeQuizQuestions = [];
let activeQuizQuestionIdx = 0;
let activeQuizScore = 0;
let activeQuizData = null;

// Speech Synthesis & Recognition Settings
let recognition = null;
let isRecording = false;

// SVGs Ring
const ringRadius = 40;
const ringCircumference = 2 * Math.PI * ringRadius;

// Timer state
let mainTimerInterval = null;
let mainTimerSeconds = 25 * 60;
let mainTimerType = 'work'; // 'work', 'short', 'long'

let subjectTimerInterval = null;
let subjectTimerSeconds = 25 * 60;

let pomoViewTimerInterval = null;
let pomoViewTimerSeconds = 25 * 60;
let pomoViewTimerType = 'work';

// ==========================================
// SYSTEM STARTUP
// ==========================================
window.addEventListener("load", () => {
    // SVGs Setup
    const healthCircleRing = document.getElementById("healthCircleRing");
    if (healthCircleRing) {
        healthCircleRing.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
        healthCircleRing.style.strokeDashoffset = ringCircumference;
    }

    // Load theme setting
    initTheme();

    // Check & Initialize all local data
    initDatabase();

    // Render components
    loadAllData();

    // Setup Pomodoro timers
    initMainPomodoro();

    // Setup voice recognition
    initVoiceRecognition();

    // Default Select Date for Calendar
    selectCalendarDate(new Date());
});

// ==========================================
// INTERACTIVE NAVIGATION (SPA)
// ==========================================
window.switchTab = function(tabId) {
    // Hide all views
    document.querySelectorAll(".tab-view").forEach(view => {
        view.classList.remove("active");
    });

    // Show selected view
    const target = document.getElementById(`view-${tabId}`);
    if (target) {
        target.classList.add("active");
    }

    // Update Top Navigation
    document.querySelectorAll(".app-header .nav-item").forEach(item => {
        if (item.getAttribute("data-tab") === tabId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Update Sidebar Navigation
    document.querySelectorAll(".app-sidebar .sidebar-nav li").forEach(item => {
        if (item.getAttribute("data-sidebar") === tabId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Trigger tab-specific refresh actions
    if (tabId === 'calendar') {
        renderCalendarGrid();
    } else if (tabId === 'leaderboard') {
        renderLeaderboard();
    } else if (tabId === 'achievements') {
        renderAchievements();
    } else if (tabId === 'streak') {
        renderStreakView();
    } else if (tabId === 'xp') {
        renderXPView();
    } else if (tabId === 'notes') {
        renderNotesList();
    } else if (tabId === 'subjects') {
        renderSubjectsGrid();
    } else if (tabId === 'pomodoro') {
        initPomoViewSubjectSelector();
        updatePomoViewDisplay();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.focusProfile = function() {
    switchTab('profile');
};

window.scrollToPlanner = function() {
    switchTab('dashboard');
    setTimeout(() => {
        const el = document.getElementById("planner-section");
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
};

// ==========================================
// THEME toggles
// ==========================================
function initTheme() {
    const themeSelector = document.getElementById("themeSelector");
    const savedTheme = localStorage.getItem("studyBuddyTheme") || "dark";
    setTheme(savedTheme);
    if (themeSelector) {
        themeSelector.value = savedTheme;
        themeSelector.addEventListener("change", () => {
            const newTheme = themeSelector.value;
            setTheme(newTheme);
            localStorage.setItem("studyBuddyTheme", newTheme);
        });
    }
    // Floating Yellow Heart Button
    const floatingYellowBtn = document.getElementById("floatingYellowThemeBtn");
    if (floatingYellowBtn) {
        floatingYellowBtn.addEventListener("click", () => {
            alert("💛 StudyBuddy AI loves you!");
        });
    }
}

function setTheme(theme) {
    // Remove all existing theme classes
    document.body.classList.remove("light-theme", "yellow-theme");
    // Add the new theme class if not dark (dark is default)
    if (theme === "light") {
        document.body.classList.add("light-theme");
    } else if (theme === "yellow") {
        document.body.classList.add("yellow-theme");
    }
    // Update dropdown value if it exists
    const themeSelector = document.getElementById("themeSelector");
    if (themeSelector) {
        themeSelector.value = theme;
    }
}

// ==========================================
// DATABASE / LOCAL STORAGE INITIALIZATION
// ==========================================
function initDatabase() {
    // 1. Profile initialization
    if (!localStorage.getItem("studyBuddyProfile")) {
        const defaultProfile = {
            name: "Alex",
            department: "Computer Science",
            weakSubject: "Java",
            careerGoal: "Full Stack Developer",
            favSubject: "Computer Science",
            studyPreference: "25m focus sessions",
            avatarSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
        };
        localStorage.setItem("studyBuddyProfile", JSON.stringify(defaultProfile));
    }

    // 2. Subjects initialization (CRUD ready)
    if (!localStorage.getItem("studyBuddySubjectsList")) {
        const defaultSubjects = [
            {
                id: "subject_math",
                name: "Mathematics",
                dailyGoalText: "Study Vector Algebra topics",
                dailyStudyTime: 30,
                tasks: [
                    { id: "task_m1", title: "Practice Linear Equations", completed: true },
                    { id: "task_m2", title: "Review Probability formulas", completed: false }
                ],
                flashcards: [
                    { id: "fc_m1", front: "What is Euler's Identity?", back: "e^(i*pi) + 1 = 0", mastered: false }
                ]
            },
            {
                id: "subject_physics",
                name: "Physics",
                dailyGoalText: "Complete Kinematics practice questions",
                dailyStudyTime: 45,
                tasks: [
                    { id: "task_p1", title: "Kinematics equations revision", completed: true },
                    { id: "task_p2", title: "Read Chapter 4 dynamics", completed: false },
                    { id: "task_p3", title: "Solve friction worksheets", completed: false }
                ],
                flashcards: [
                    { id: "fc_p1", front: "State Newton's Second Law", back: "F = ma", mastered: false }
                ]
            },
            {
                id: "subject_chem",
                name: "Chemistry",
                dailyGoalText: "Learn Organic IUPAC Naming",
                dailyStudyTime: 30,
                tasks: [
                    { id: "task_c1", title: "Balancing equations sheet", completed: true },
                    { id: "task_c2", title: "Draw Alkane chains structures", completed: false }
                ],
                flashcards: [
                    { id: "fc_c1", front: "Avogadro's Number value?", back: "6.022 x 10^23 molecules/mol", mastered: false }
                ]
            },
            {
                id: "subject_cs",
                name: "Computer Science",
                dailyGoalText: "Java Inheritance & Interfaces",
                dailyStudyTime: 60,
                tasks: [
                    { id: "task_cs1", title: "Java revise inheritance hierarchy", completed: true },
                    { id: "task_cs2", title: "Design polymorphism interfaces", completed: false }
                ],
                flashcards: [
                    { id: "fc_cs1", front: "What is Inheritance?", back: "Acquiring properties and behaviors from a parent class.", mastered: false }
                ]
            }
        ];
        localStorage.setItem("studyBuddySubjectsList", JSON.stringify(defaultSubjects));
    }

    // 3. Calendar Study Plans
    if (!localStorage.getItem("studyBuddyCalendarPlans")) {
        const defaultCalendar = {
            "2026-06-20": [
                { id: "plan_1", subject: "Computer Science", minutes: 30 },
                { id: "plan_2", subject: "Mathematics", minutes: 25 }
            ],
            "2026-06-21": [
                { id: "plan_3", subject: "Physics", minutes: 45 }
            ]
        };
        localStorage.setItem("studyBuddyCalendarPlans", JSON.stringify(defaultCalendar));
    }

    // 4. Study Sessions log (for Streaks & Charts)
    if (!localStorage.getItem("studyBuddySessionsLog")) {
        const defaultLog = [];
        const now = new Date();
        // Generate mock logs for the past 5 days to establish a streak
        for (let i = 0; i < 5; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            defaultLog.push({
                id: `session_mock_${i}`,
                date: date.toISOString().split('T')[0],
                duration: 25 + (i % 3) * 15,
                subjectId: "subject_cs"
            });
        }
        localStorage.setItem("studyBuddySessionsLog", JSON.stringify(defaultLog));
    }

    // 5. XP points and history logs
    if (!localStorage.getItem("studyBuddyXP")) {
        const defaultXP = {
            totalXP: 550,
            history: [
                { id: "log_1", points: 30, description: "Completed study session", time: new Date(Date.now() - 86400000).toISOString() },
                { id: "log_2", points: 20, description: "Answered Quiz question", time: new Date(Date.now() - 43200000).toISOString() }
            ]
        };
        localStorage.setItem("studyBuddyXP", JSON.stringify(defaultXP));
    }

    // 6. Notes Files
    if (!localStorage.getItem("studyBuddyNotesList")) {
        const defaultNotes = [
            { id: "note_1", name: "Java_OOP_Revision.pdf", size: "1.2 MB", type: "application/pdf", uploadDate: "2026-06-19", subjectId: "subject_cs" },
            { id: "note_2", name: "Math_Equations_CheatSheet.txt", size: "12 KB", type: "text/plain", uploadDate: "2026-06-20", subjectId: "subject_math" }
        ];
        localStorage.setItem("studyBuddyNotesList", JSON.stringify(defaultNotes));
    }

    // 7. Simulated Leaderboard
    if (!localStorage.getItem("studyBuddyLeaderboardMock")) {
        const defaultLeaders = [
            { rank: 1, name: "Raj ⭐ Quiz Champion", points: 3200, streak: 15, hours: 42, topBadge: "Quiz Champion" },
            { rank: 2, name: "Arun 🔥 30 Day Streak", points: 2900, streak: 30, hours: 38, topBadge: "30 Day Streak" },
            { rank: 3, name: "Priya 🏆 Fast Learner", points: 2650, streak: 9, hours: 32, topBadge: "Fast Learner" },
            { rank: 5, name: "Rohan", points: 350, streak: 5, hours: 14, topBadge: "AI Beginner" }
        ];
        localStorage.setItem("studyBuddyLeaderboardMock", JSON.stringify(defaultLeaders));
    }

    // 8. Chat log history
    if (!localStorage.getItem("studyBuddyChatHistory")) {
        const defaultChat = [
            { sender: "bot", text: "Hey! Ready to learn today? What subject should we cover?", time: new Date(Date.now() - 600000).toISOString() }
        ];
        localStorage.setItem("studyBuddyChatHistory", JSON.stringify(defaultChat));
    }
}

// ==========================================
// DYNAMIC PROGRESS CALCULATION & INGEST
// ==========================================
function loadAllData() {
    const profile = JSON.parse(localStorage.getItem("studyBuddyProfile"));
    const hasProfile = !!profile;

    // Toggle dashboard widgets states
    toggleDashboardStates(hasProfile);

    if (hasProfile) {
        // Load navigation avatar
        const navAvatar = document.getElementById("navAvatar");
        if (navAvatar && profile.avatarSrc) {
            navAvatar.src = profile.avatarSrc;
        }

        // Fill profile forms
        document.getElementById("name").value = profile.name || "";
        document.getElementById("department").value = profile.department || "";
        document.getElementById("weakSubject").value = profile.weakSubject || "";
        document.getElementById("careerGoal").value = profile.careerGoal || "";
        document.getElementById("favSubject").value = profile.favSubject || "";
        document.getElementById("studyPreference").value = profile.studyPreference || "";

        // Select correct profile preset avatar
        document.querySelectorAll(".avatar-option").forEach(opt => {
            if (opt.src === profile.avatarSrc) {
                opt.classList.add("selected");
            } else {
                opt.classList.remove("selected");
            }
        });

        // Set status text
        document.getElementById("profileStatusText").textContent = `Memory Profile Active for ${profile.name}`;

        // Populate lists
        renderDashboardPlanner();
        renderRecentChats();
        renderSubjectsGrid();
        updateDynamicMetrics();
    }
}

function toggleDashboardStates(hasProfile) {
    const plannerEmpty = document.getElementById("dashboardPlannerEmptyState");
    const plannerContent = document.getElementById("dashboardPlannerContentState");
    const progressEmpty = document.getElementById("dashboardProgressEmptyState");
    const progressContent = document.getElementById("dashboardProgressContentState");
    const chatEmpty = document.getElementById("dashboardChatEmptyState");
    const chatContent = document.getElementById("dashboardChatContentState");
    
    // Notes View state
    const notesEmpty = document.getElementById("notesEmptyState");
    const notesContent = document.getElementById("notesContentState");

    // Quiz View state
    const quizEmpty = document.getElementById("quizEmptyState");
    const quizContent = document.getElementById("quizContentState");

    // AI Tutor state
    const tutorEmpty = document.getElementById("tutorEmptyState");
    const tutorContent = document.getElementById("tutorContentState");

    // Progress stats tab states
    const progressStatsEmpty = document.getElementById("progressStatsEmptyState");
    const progressStatsContent = document.getElementById("progressStatsContentState");
    const progressInsightsEmpty = document.getElementById("progressInsightsEmptyState");
    const progressInsightsContent = document.getElementById("progressInsightsContentState");
    const progressHealthEmpty = document.getElementById("progressHealthEmptyState");
    const progressHealthContent = document.getElementById("progressHealthContentState");
    const progressChartsEmpty = document.getElementById("progressChartsEmptyState");
    const progressChartsContent = document.getElementById("progressChartsContentState");
    const progressTimelineEmpty = document.getElementById("progressTimelineEmptyState");
    const progressTimelineContent = document.getElementById("progressTimelineContentState");

    if (hasProfile) {
        if (plannerEmpty) plannerEmpty.style.display = "none";
        if (plannerContent) plannerContent.style.display = "block";
        if (progressEmpty) progressEmpty.style.display = "none";
        if (progressContent) progressContent.style.display = "block";
        if (chatEmpty) chatEmpty.style.display = "none";
        if (chatContent) chatContent.style.display = "block";

        if (notesEmpty) notesEmpty.style.display = "none";
        if (notesContent) notesContent.style.display = "block";
        if (quizEmpty) quizEmpty.style.display = "none";
        if (quizContent) quizContent.style.display = "block";
        if (tutorEmpty) tutorEmpty.style.display = "none";
        if (tutorContent) tutorContent.style.display = "block";

        if (progressStatsEmpty) progressStatsEmpty.style.display = "none";
        if (progressStatsContent) progressStatsContent.style.display = "block";
        if (progressInsightsEmpty) progressInsightsEmpty.style.display = "none";
        if (progressInsightsContent) progressInsightsContent.style.display = "block";
        if (progressHealthEmpty) progressHealthEmpty.style.display = "none";
        if (progressHealthContent) progressHealthContent.style.display = "block";
        if (progressChartsEmpty) progressChartsEmpty.style.display = "none";
        if (progressChartsContent) progressChartsContent.style.display = "block";
        if (progressTimelineEmpty) progressTimelineEmpty.style.display = "none";
        if (progressTimelineContent) progressTimelineContent.style.display = "block";
    } else {
        if (plannerEmpty) plannerEmpty.style.display = "flex";
        if (plannerContent) plannerContent.style.display = "none";
        if (progressEmpty) progressEmpty.style.display = "flex";
        if (progressContent) progressContent.style.display = "none";
        if (chatEmpty) chatEmpty.style.display = "flex";
        if (chatContent) chatContent.style.display = "none";

        if (notesEmpty) notesEmpty.style.display = "flex";
        if (notesContent) notesContent.style.display = "none";
        if (quizEmpty) quizEmpty.style.display = "flex";
        if (quizContent) quizContent.style.display = "none";
        if (tutorEmpty) tutorEmpty.style.display = "flex";
        if (tutorContent) tutorContent.style.display = "none";

        if (progressStatsEmpty) progressStatsEmpty.style.display = "flex";
        if (progressStatsContent) progressStatsContent.style.display = "none";
        if (progressInsightsEmpty) progressInsightsEmpty.style.display = "flex";
        if (progressInsightsContent) progressInsightsContent.style.display = "none";
        if (progressHealthEmpty) progressHealthEmpty.style.display = "flex";
        if (progressHealthContent) progressHealthContent.style.display = "none";
        if (progressChartsEmpty) progressChartsEmpty.style.display = "flex";
        if (progressChartsContent) progressChartsContent.style.display = "none";
        if (progressTimelineEmpty) progressTimelineEmpty.style.display = "flex";
        if (progressTimelineContent) progressTimelineContent.style.display = "none";
    }
}

// ==========================================
// METRICS & PROGRESS LOGIC
// ==========================================
function updateDynamicMetrics() {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessionsLog")) || [];
    const xpData = JSON.parse(localStorage.getItem("studyBuddyXP")) || { totalXP: 0 };

    // Calculate total dynamic checklist stats
    let totalTasksCount = 0;
    let completedTasksCount = 0;

    subjects.forEach(sub => {
        if (sub.tasks) {
            totalTasksCount += sub.tasks.length;
            completedTasksCount += sub.tasks.filter(t => t.completed).length;
        }
    });

    const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    // Update Progress Gauge
    const healthGaugeValue = document.getElementById("healthGaugeValue");
    if (healthGaugeValue) healthGaugeValue.textContent = `${completionRate}%`;

    const healthCircleRing = document.getElementById("healthCircleRing");
    if (healthCircleRing) {
        const offset = ringCircumference - (completionRate / 100) * ringCircumference;
        healthCircleRing.style.strokeDashoffset = offset;
        healthCircleRing.style.stroke = completionRate >= 75 ? "#22c55e" : (completionRate >= 40 ? "#06b6d4" : "#f97316");
    }

    // Update XP Points display on Dashboard
    const xpPointsVal = document.getElementById("xpPointsVal");
    if (xpPointsVal) xpPointsVal.textContent = xpData.totalXP.toLocaleString();

    // Calculate Streak based on consecutive active days
    const streak = calculateCurrentStreak(sessions);
    const streakVal = document.getElementById("streakVal");
    if (streakVal) streakVal.textContent = `${streak} Days`;

    // Render insights and memory statistics
    renderMemoryStatistics(subjects, sessions);
}

function calculateCurrentStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    
    // Extract unique sorted active dates in YYYY-MM-DD format
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    
    let streak = 0;
    let checkDate = new Date();
    
    // If the latest logged date is today or yesterday, start tracking
    const todayStr = checkDate.toISOString().split('T')[0];
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];

    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
        return 0; // Streak broken
    }

    let currentDate = new Date(dates[0]);
    streak = 1;

    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i]);
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
            currentDate = prevDate;
        } else if (diffDays > 1) {
            break; // Streak broken
        }
    }
    return streak;
}

function renderMemoryStatistics(subjects, sessions) {
    const statEntries = document.getElementById("statEntries");
    const statSessions = document.getElementById("statSessions");
    const statWeak = document.getElementById("statWeak");
    const statProjects = document.getElementById("statProjects");

    const profile = JSON.parse(localStorage.getItem("studyBuddyProfile")) || {};
    const notes = JSON.parse(localStorage.getItem("studyBuddyNotesList")) || [];
    const chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];

    // Calculate total entries counts
    const entriesCount = subjects.reduce((sum, s) => sum + (s.tasks ? s.tasks.length : 0), 0) + notes.length + chatHistory.length;
    
    if (statEntries) statEntries.textContent = entriesCount;
    if (statSessions) statSessions.textContent = sessions.length;
    if (statWeak) {
        const weakList = profile.weakSubject ? profile.weakSubject.split(',').map(s => s.trim()).filter(Boolean) : [];
        statWeak.textContent = weakList.length;
    }
    if (statProjects) {
        // dynamic calculation: based on level and completed tasks
        const level = getLevelFromXP(JSON.parse(localStorage.getItem("studyBuddyXP")).totalXP);
        statProjects.textContent = level + 4;
    }

    // Render memory insights
    const insightsList = document.getElementById("memoryInsightsList");
    if (insightsList) {
        insightsList.innerHTML = "";
        
        const weakSubject = profile.weakSubject || "Java";
        const careerGoal = profile.careerGoal || "Full Stack Developer";

        const insight1 = document.createElement("li");
        insight1.textContent = `You studied ${sessions.length} times recently, concentrating on ${profile.favSubject || 'core subjects'}.`;
        
        const insight2 = document.createElement("li");
        insight2.textContent = `Retention score: ${completedTasksCountForSubject(subjects)} tasks finished. Focus recommended on your weak subject: ${weakSubject}.`;
        
        const insight3 = document.createElement("li");
        insight3.textContent = `Your career target is ${careerGoal}. Dynamic notes generated match this target.`;

        insightsList.appendChild(insight1);
        insightsList.appendChild(insight2);
        insightsList.appendChild(insight3);
    }

    // Update Progress health score percentage
    const progressHealthPercent = document.getElementById("progressHealthPercent");
    if (progressHealthPercent) {
        let totalTasks = 0;
        let doneTasks = 0;
        subjects.forEach(sub => {
            if (sub.tasks) {
                totalTasks += sub.tasks.length;
                doneTasks += sub.tasks.filter(t => t.completed).length;
            }
        });
        const score = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        progressHealthPercent.textContent = `${score}%`;
    }

    // Render memory timelines
    renderMemoryTimeline(sessions);
    renderActivityCharts(sessions);
}

function completedTasksCountForSubject(subjects) {
    return subjects.reduce((sum, s) => sum + (s.tasks ? s.tasks.filter(t => t.completed).length : 0), 0);
}

function renderMemoryTimeline(sessions) {
    const list = document.getElementById("timelineList");
    if (!list) return;
    list.innerHTML = "";
    
    if (sessions.length === 0) {
        list.innerHTML = "<li>No study sessions recorded yet. Start Pomodoro sessions to log activity.</li>";
        return;
    }

    // Sort latest first
    const sorted = [...sessions].sort((a,b) => new Date(b.date) - new Date(a.date));

    sorted.slice(0, 5).forEach(session => {
        const li = document.createElement("li");
        const dateObj = new Date(session.date);
        li.innerHTML = `
            <strong>Studied for ${session.duration} minutes</strong>
            <small>Session Date: ${dateObj.toLocaleDateString()} | Topic ID: ${session.subjectId ? session.subjectId.replace('subject_', '').toUpperCase() : 'General'}</small>
        `;
        list.appendChild(li);
    });
}

function renderActivityCharts(sessions) {
    const chart = document.getElementById("progressWeeklyChart");
    if (!chart) return;
    chart.innerHTML = "";

    // Calculate weekly study hours per day (Mon-Sun)
    const hours = [0, 0, 0, 0, 0, 0, 0]; // Mon = 0, Sun = 6
    const today = new Date();
    
    // Get start date of current week (Monday)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    sessions.forEach(s => {
        const sessionDate = new Date(s.date);
        if (sessionDate >= monday) {
            const dayIdx = sessionDate.getDay() === 0 ? 6 : sessionDate.getDay() - 1;
            hours[dayIdx] += s.duration / 60; // Convert to hours
        }
    });

    // Render bars
    hours.forEach((h, i) => {
        const barHeight = Math.min(100, Math.round(h * 15)); // scale factor
        const bar = document.createElement("div");
        bar.style.width = "20px";
        bar.style.height = `${Math.max(4, barHeight)}%`;
        bar.style.background = "var(--primary)";
        bar.style.borderRadius = "4px 4px 0 0";
        bar.title = `${h.toFixed(1)} hours`;
        chart.appendChild(bar);
    });

    // Update monthly progress bar
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round(totalMinutes / 60);
    
    const progressMonthlyHoursText = document.getElementById("progressMonthlyHoursText");
    if (progressMonthlyHoursText) progressMonthlyHoursText.textContent = `${totalHours}h`;

    const progressMonthlyBar = document.getElementById("progressMonthlyBar");
    if (progressMonthlyBar) {
        // Target goal = 40 hours per month
        const percent = Math.min(100, Math.round((totalHours / 40) * 100));
        progressMonthlyBar.style.width = `${percent}%`;
    }
}

// ==========================================
// START LEARNING BUTTON ROUTER
// ==========================================
window.startLearningBtnClick = function() {
    // If a subject is selected, open Pomodoro for that subject, else general
    if (activeSubjectId) {
        switchTab('pomodoro');
        const selector = document.getElementById("pomoViewSubjectSelector");
        if (selector) {
            selector.value = activeSubjectId;
            updatePomoViewSubjectLabel();
        }
    } else {
        switchTab('pomodoro');
    }
};

// ==========================================
// TODAY'S GOALS / DASHBOARD PLANNER
// ==========================================
function renderDashboardPlanner() {
    const list = document.getElementById("dashboardPlanList");
    if (!list) return;
    list.innerHTML = "";

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    
    let tasksRendered = 0;

    subjects.forEach(subject => {
        if (subject.tasks) {
            subject.tasks.forEach(task => {
                const li = document.createElement("li");
                if (task.completed) li.classList.add("completed");
                
                li.innerHTML = `
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleDashboardTask('${subject.id}', '${task.id}', this.checked)">
                    <div class="planner-item-content">
                        <span class="planner-item-title">${task.title}</span>
                        <span class="planner-item-time">${subject.name} | Goal: ${subject.dailyGoalText || 'Study'}</span>
                    </div>
                    <i class="fa-solid fa-trash-can" style="margin-left: auto; color: var(--text-secondary); cursor: pointer;" onclick="deleteDashboardTask('${subject.id}', '${task.id}')"></i>
                `;
                list.appendChild(li);
                tasksRendered++;
            });
        }
    });

    if (tasksRendered === 0) {
        list.innerHTML = `<li style="justify-content: center; font-size:12px; color: var(--text-secondary);">No goals created. Add a subject or task to get started!</li>`;
    }
}

window.toggleDashboardTask = function(subjectId, taskId, isChecked) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subIdx = subjects.findIndex(s => s.id === subjectId);
    if (subIdx > -1) {
        const taskIdx = subjects[subIdx].tasks.findIndex(t => t.id === taskId);
        if (taskIdx > -1) {
            subjects[subIdx].tasks[taskIdx].completed = isChecked;
            localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
            
            // Log XP point
            if (isChecked) {
                awardXP(30, `Completed task: ${subjects[subIdx].tasks[taskIdx].title}`);
            }
            
            loadAllData();
            if (activeSubjectId === subjectId) {
                renderSubjectDetail(subjectId);
            }
        }
    }
};

window.deleteDashboardTask = function(subjectId, taskId) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subIdx = subjects.findIndex(s => s.id === subjectId);
    if (subIdx > -1) {
        subjects[subIdx].tasks = subjects[subIdx].tasks.filter(t => t.id !== taskId);
        localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
        loadAllData();
        if (activeSubjectId === subjectId) {
            renderSubjectDetail(subjectId);
        }
    }
};

window.triggerAddNewGoal = function() {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    if (subjects.length === 0) {
        alert("Please add a subject first before adding planner tasks!");
        switchTab('subjects');
        return;
    }

    const title = prompt("Enter new task title:");
    if (!title || !title.trim()) return;

    // Pick subject options
    let promptText = "Choose Subject Number:\n";
    subjects.forEach((s, idx) => {
        promptText += `${idx + 1}. ${s.name}\n`;
    });
    
    const choice = prompt(promptText);
    const chosenIdx = parseInt(choice) - 1;
    if (isNaN(chosenIdx) || chosenIdx < 0 || chosenIdx >= subjects.length) {
        alert("Invalid subject choice selection.");
        return;
    }

    const subject = subjects[chosenIdx];
    const newTask = {
        id: `task_${Date.now()}`,
        title: title.trim(),
        completed: false
    };

    if (!subject.tasks) subject.tasks = [];
    subject.tasks.push(newTask);

    subjects[chosenIdx] = subject;
    localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
    
    awardXP(10, `Added plan task: ${title}`);
    loadAllData();
};

// ==========================================
// SUBJECTS GRID & SUBJECT DETAIL CRUD
// ==========================================
function renderSubjectsGrid() {
    const grid = document.getElementById("subjectsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];

    subjects.forEach(subject => {
        // Calculate progress dynamically
        let progress = 0;
        if (subject.tasks && subject.tasks.length > 0) {
            const completed = subject.tasks.filter(t => t.completed).length;
            progress = Math.round((completed / subject.tasks.length) * 100);
        }

        const card = document.createElement("div");
        card.className = "card subject-card";
        card.innerHTML = `
            <div class="subject-icon cs-icon" style="background: rgba(139, 92, 246, 0.1); color: var(--primary);">
                <i class="fa-solid fa-book-open"></i>
            </div>
            <h3>${subject.name}</h3>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px;">
                Goal: ${subject.dailyGoalText || '-'} | Daily Focus: ${subject.dailyStudyTime || 25}m
            </div>
            <div class="subject-progress">
                <div class="progress-labels">
                    <span>Progress</span>
                    <span>${progress}%</span>
                </div>
                <div class="progress-bar-outer">
                    <div class="progress-bar-inner" style="width: ${progress}%;"></div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; width: 100%; margin-top: 15px;">
                <button class="btn-continue" onclick="openSubjectDetail('${subject.id}')" style="flex: 2;">Continue Learning</button>
                <button class="btn-upgrade" onclick="triggerDeleteSubject('${subject.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); flex: 1;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.triggerAddSubject = function() {
    const name = prompt("Enter new subject name:");
    if (!name || !name.trim()) return;

    const goal = prompt("Enter daily learning goal (e.g. Revision Chapter 1):", "Read and practice core concepts");
    const minsStr = prompt("Enter study focus minutes per day:", "25");
    const mins = parseInt(minsStr) || 25;

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const newSub = {
        id: `subject_${Date.now()}`,
        name: name.trim(),
        dailyGoalText: goal.trim(),
        dailyStudyTime: mins,
        tasks: [],
        flashcards: []
    };

    subjects.push(newSub);
    localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
    
    awardXP(50, `Added new Subject folder: ${name}`);
    loadAllData();
    renderSubjectsGrid();
};

window.openSubjectDetail = function(subjectId) {
    activeSubjectId = subjectId;
    switchTab('subject-detail');
    renderSubjectDetail(subjectId);
};

function renderSubjectDetail(subjectId) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Set Header titles
    document.getElementById("subjectDetailName").textContent = subject.name;
    document.getElementById("subjectDetailGoals").textContent = `Daily Study Goal: ${subject.dailyGoalText || '-'} | Target: ${subject.dailyStudyTime || 25} minutes focus`;

    // Calculate progress dynamically
    let progress = 0;
    if (subject.tasks && subject.tasks.length > 0) {
        const completed = subject.tasks.filter(t => t.completed).length;
        progress = Math.round((completed / subject.tasks.length) * 100);
    }
    document.getElementById("subjectDetailProgressText").textContent = `${progress}%`;
    document.getElementById("subjectDetailProgressBar").style.width = `${progress}%`;

    // Populate Tasks List
    const taskList = document.getElementById("subjectTaskList");
    taskList.innerHTML = "";
    if (subject.tasks && subject.tasks.length > 0) {
        subject.tasks.forEach(task => {
            const li = document.createElement("li");
            if (task.completed) li.classList.add("completed");
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleSubjectTask('${task.id}', this.checked)">
                <div class="planner-item-content">
                    <span class="planner-item-title">${task.title}</span>
                </div>
                <i class="fa-solid fa-trash-can" style="margin-left: auto; color: var(--text-secondary); cursor: pointer;" onclick="deleteSubjectTask('${task.id}')"></i>
            `;
            taskList.appendChild(li);
        });
    } else {
        taskList.innerHTML = `<li style="font-size:12px; color: var(--text-secondary); justify-content: center;">No subject tasks yet.</li>`;
    }

    // Populate Flashcards
    currentFlashcardIdx = 0;
    renderSubjectFlashcardWidget(subject);

    // AI recommendation custom text based on profile
    const profile = JSON.parse(localStorage.getItem("studyBuddyProfile")) || {};
    const aiRec = document.getElementById("subjectAIRecommendation");
    if (aiRec) {
        aiRec.innerHTML = `Based on your Goal (**${profile.careerGoal || 'Full Stack'}**) and Weak subject (**${profile.weakSubject || 'Java'}**), we suggest:<br>• Review 2 flashcards in **${subject.name}**.<br>• Perform a 25-minute Pomodoro focus block today.`;
    }

    // Set Pomodoro subject countdown defaults
    document.getElementById("subjectTimerMins").value = subject.dailyStudyTime || 25;
    subjectTimerSeconds = (subject.dailyStudyTime || 25) * 60;
    updateSubjectTimerDisplay();
}

window.triggerEditSubject = function(subjectId) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const idx = subjects.findIndex(s => s.id === subjectId);
    if (idx === -1) return;

    const goal = prompt("Enter new daily learning goal:", subjects[idx].dailyGoalText);
    if (goal === null) return;
    const minsStr = prompt("Enter daily focus minutes:", subjects[idx].dailyStudyTime);
    if (minsStr === null) return;

    subjects[idx].dailyGoalText = goal;
    subjects[idx].dailyStudyTime = parseInt(minsStr) || 25;
    
    localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
    renderSubjectDetail(subjectId);
    loadAllData();
};

window.triggerRenameSubject = function(subjectId) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const idx = subjects.findIndex(s => s.id === subjectId);
    if (idx === -1) return;

    const name = prompt("Enter new name for subject:", subjects[idx].name);
    if (!name || !name.trim()) return;

    subjects[idx].name = name.trim();
    localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
    renderSubjectDetail(subjectId);
    loadAllData();
};

window.triggerDeleteSubject = function(subjectId) {
    if (!confirm("Are you sure you want to delete this subject and all its tasks/flashcards?")) return;

    let subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    subjects = subjects.filter(s => s.id !== subjectId);
    localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));

    activeSubjectId = null;
    switchTab('subjects');
    loadAllData();
};

// Subject Tasks
window.toggleSubjectTask = function(taskId, isChecked) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subIdx = subjects.findIndex(s => s.id === activeSubjectId);
    if (subIdx > -1) {
        const tIdx = subjects[subIdx].tasks.findIndex(t => t.id === taskId);
        if (tIdx > -1) {
            subjects[subIdx].tasks[tIdx].completed = isChecked;
            localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
            if (isChecked) {
                awardXP(30, `Completed task: ${subjects[subIdx].tasks[tIdx].title}`);
            }
            renderSubjectDetail(activeSubjectId);
            loadAllData();
        }
    }
};

window.deleteSubjectTask = function(taskId) {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subIdx = subjects.findIndex(s => s.id === activeSubjectId);
    if (subIdx > -1) {
        subjects[subIdx].tasks = subjects[subIdx].tasks.filter(t => t.id !== taskId);
        localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
        renderSubjectDetail(activeSubjectId);
        loadAllData();
    }
};

window.triggerAddSubjectTask = function() {
    const title = prompt("Enter task title:");
    if (!title || !title.trim()) return;

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subIdx = subjects.findIndex(s => s.id === activeSubjectId);
    if (subIdx > -1) {
        const newTask = {
            id: `task_${Date.now()}`,
            title: title.trim(),
            completed: false
        };
        if (!subjects[subIdx].tasks) subjects[subIdx].tasks = [];
        subjects[subIdx].tasks.push(newTask);
        
        localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
        awardXP(10, `Added subject task: ${title}`);
        renderSubjectDetail(activeSubjectId);
        loadAllData();
    }
};

// ==========================================
// DYNAMIC SUBJECT FLASHCARDS WIDGET
// ==========================================
function renderSubjectFlashcardWidget(subject) {
    const container = document.getElementById("flashcardContainer");
    const empty = document.getElementById("flashcardEmpty");
    const idxText = document.getElementById("flashcardIndexText");

    const flashcards = subject.flashcards || [];

    if (flashcards.length === 0) {
        container.style.display = "none";
        empty.style.display = "flex";
        idxText.textContent = "0 / 0";
        return;
    }

    container.style.display = "block";
    empty.style.display = "none";

    const fc = flashcards[currentFlashcardIdx];
    document.getElementById("flashcardFrontText").textContent = fc.front;
    document.getElementById("flashcardBackText").textContent = fc.back;
    idxText.textContent = `${currentFlashcardIdx + 1} / ${flashcards.length}`;

    // Reset card rotations state
    document.getElementById("flashcardInner").style.transform = "";
}

window.flipFlashcard = function() {
    const inner = document.getElementById("flashcardInner");
    if (inner.style.transform === "rotateY(180deg)") {
        inner.style.transform = "rotateY(0deg)";
    } else {
        inner.style.transform = "rotateY(180deg)";
    }
};

window.nextFlashcard = function() {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subject = subjects.find(s => s.id === activeSubjectId);
    if (subject && subject.flashcards && subject.flashcards.length > 0) {
        currentFlashcardIdx = (currentFlashcardIdx + 1) % subject.flashcards.length;
        renderSubjectFlashcardWidget(subject);
    }
};

window.prevFlashcard = function() {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subject = subjects.find(s => s.id === activeSubjectId);
    if (subject && subject.flashcards && subject.flashcards.length > 0) {
        currentFlashcardIdx = (currentFlashcardIdx - 1 + subject.flashcards.length) % subject.flashcards.length;
        renderSubjectFlashcardWidget(subject);
    }
};

window.triggerAddFlashcard = function() {
    const front = prompt("Enter Flashcard Front (Question):");
    if (!front || !front.trim()) return;
    const back = prompt("Enter Flashcard Back (Answer/Details):");
    if (!back || !back.trim()) return;

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const idx = subjects.findIndex(s => s.id === activeSubjectId);
    if (idx > -1) {
        if (!subjects[idx].flashcards) subjects[idx].flashcards = [];
        subjects[idx].flashcards.push({
            id: `fc_${Date.now()}`,
            front: front.trim(),
            back: back.trim(),
            mastered: false
        });
        localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
        awardXP(15, `Created Flashcard front: ${front}`);
        renderSubjectDetail(activeSubjectId);
    }
};

window.markFlashcardMastered = function() {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const sIdx = subjects.findIndex(s => s.id === activeSubjectId);
    if (sIdx > -1 && subjects[sIdx].flashcards && subjects[sIdx].flashcards.length > 0) {
        const fc = subjects[sIdx].flashcards[currentFlashcardIdx];
        if (!fc.mastered) {
            fc.mastered = true;
            subjects[sIdx].flashcards[currentFlashcardIdx] = fc;
            localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
            awardXP(20, `Mastered Flashcard: ${fc.front}`);
            alert("Flashcard marked as Mastered! +20 XP");
        } else {
            alert("Already marked as mastered!");
        }
    }
};

window.deleteCurrentFlashcard = function() {
    if (!confirm("Delete this flashcard?")) return;
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const sIdx = subjects.findIndex(s => s.id === activeSubjectId);
    if (sIdx > -1 && subjects[sIdx].flashcards && subjects[sIdx].flashcards.length > 0) {
        subjects[sIdx].flashcards.splice(currentFlashcardIdx, 1);
        localStorage.setItem("studyBuddySubjectsList", JSON.stringify(subjects));
        currentFlashcardIdx = 0;
        renderSubjectDetail(activeSubjectId);
    }
};

// ==========================================
// DEDICATED SUBJECT MINI QUIZ WIDGET
// ==========================================
let subjectQuizIdx = 0;
let subjectQuizScoreVal = 0;
const mockQuestionsData = {
    "Mathematics": [
        { q: "What is the derivative of x^2?", a: "2x", options: ["2x", "x^3", "2", "x"] },
        { q: "What is log(1) equal to?", a: "0", options: ["0", "1", "10", "e"] }
    ],
    "Physics": [
        { q: "What unit measures electrical resistance?", a: "Ohm", options: ["Ohm", "Volt", "Ampere", "Watt"] },
        { q: "What is the speed of light in vacuum?", a: "3x10^8 m/s", options: ["3x10^8 m/s", "1.5x10^6 m/s", "9.8 m/s^2", "3x10^5 km/s"] }
    ],
    "Computer Science": [
        { q: "Which class is the superclass of all Java classes?", a: "Object", options: ["Object", "Class", "String", "System"] },
        { q: "Which structure uses First-In-First-Out (FIFO)?", a: "Queue", options: ["Queue", "Stack", "Tree", "Graph"] }
    ]
};

window.startSubjectMiniQuiz = function() {
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const subject = subjects.find(s => s.id === activeSubjectId);
    if (!subject) return;

    const list = mockQuestionsData[subject.name] || [
        { q: `What is a primary concept of ${subject.name}?`, a: "Core details", options: ["Core details", "None", "Alternative", "Incorrect Option"] }
    ];

    subjectQuizIdx = 0;
    subjectQuizScoreVal = 0;

    document.getElementById("subjectQuizEmpty").style.display = "none";
    const container = document.getElementById("subjectQuizContainer");
    container.style.display = "block";

    renderSubjectQuizQuestion(list);
};

function renderSubjectQuizQuestion(list) {
    if (subjectQuizIdx >= list.length) {
        document.getElementById("subjectQuizQuestion").textContent = "Quiz Complete!";
        document.getElementById("subjectQuizOptions").innerHTML = "";
        document.getElementById("subjectQuizFeedback").innerHTML = `You scored: ${subjectQuizScoreVal} / ${list.length}. <button class="btn-primary" onclick="resetSubjectMiniQuiz()" style="font-size:11px; width:auto; padding:6px 12px; margin-top:8px;">Exit Quiz</button>`;
        awardXP(subjectQuizScoreVal * 20, `Finished subject mini quiz`);
        updateDynamicMetrics();
        return;
    }

    const qItem = list[subjectQuizIdx];
    document.getElementById("subjectQuizQuestion").textContent = qItem.q;
    document.getElementById("subjectQuizFeedback").textContent = "";

    const optsContainer = document.getElementById("subjectQuizOptions");
    optsContainer.innerHTML = "";

    qItem.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "btn-outline option-btn";
        btn.textContent = opt;
        btn.onclick = () => {
            if (opt === qItem.a) {
                subjectQuizScoreVal++;
                document.getElementById("subjectQuizFeedback").textContent = "Correct! +20 XP potential.";
                document.getElementById("subjectQuizFeedback").style.color = "#22c55e";
            } else {
                document.getElementById("subjectQuizFeedback").textContent = `Incorrect. Correct: ${qItem.a}`;
                document.getElementById("subjectQuizFeedback").style.color = "#ef4444";
            }
            setTimeout(() => {
                subjectQuizIdx++;
                renderSubjectQuizQuestion(list);
            }, 1500);
        };
        optsContainer.appendChild(btn);
    });
}

window.resetSubjectMiniQuiz = function() {
    document.getElementById("subjectQuizEmpty").style.display = "block";
    document.getElementById("subjectQuizContainer").style.display = "none";
};

// ==========================================
// STUDY STREAK VIEW / CALENDAR & CHART
// ==========================================
function renderStreakView() {
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessionsLog")) || [];
    
    // Streaks
    const current = calculateCurrentStreak(sessions);
    document.getElementById("streakViewCurrent").textContent = `${current} Days`;
    
    // Set longest streak to max of current or mock
    const longest = Math.max(current, 7);
    document.getElementById("streakViewLongest").textContent = `${longest} Days`;

    // Sessions metrics
    document.getElementById("streakViewSessionsText").textContent = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round(totalMinutes / 60);
    document.getElementById("streakViewHoursText").textContent = `${totalHours}h`;

    // Render 7-day Activity Chart in Mins
    const chart = document.getElementById("streakActivityChart");
    if (chart) {
        chart.innerHTML = "";
        const mins = [0,0,0,0,0,0,0];
        const today = new Date();
        const distanceToMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - distanceToMonday);
        monday.setHours(0,0,0,0);

        sessions.forEach(s => {
            const date = new Date(s.date);
            if (date >= monday) {
                const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
                mins[dayIdx] += s.duration;
            }
        });

        mins.forEach((m, idx) => {
            const hPercent = Math.min(100, Math.round((m / 90) * 100)); // limit 90 mins max display height
            const bar = document.createElement("div");
            bar.style.width = "24px";
            bar.style.height = `${Math.max(4, hPercent)}%`;
            bar.style.background = "linear-gradient(to top, var(--primary), var(--teal))";
            bar.style.borderRadius = "6px 6px 0 0";
            bar.title = `${m} minutes`;
            chart.appendChild(bar);
        });
    }

    // Render Calendar representation
    const calendarGrid = document.getElementById("streakMonthlyCalendar");
    if (calendarGrid) {
        calendarGrid.innerHTML = "";
        const daysInMonth = 30; // June placeholder
        
        // Active dates list
        const activeDatesStr = sessions.map(s => s.date);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
            const isActive = activeDatesStr.includes(dateStr);
            
            const cell = document.createElement("div");
            cell.style.padding = "6px";
            cell.style.borderRadius = "6px";
            cell.style.background = isActive ? "rgba(249, 115, 22, 0.15)" : "rgba(255,255,255,0.02)";
            cell.style.border = isActive ? "1px solid var(--orange)" : "1px solid rgba(255,255,255,0.04)";
            cell.style.color = isActive ? "#fff" : "var(--text-secondary)";
            cell.innerHTML = `
                <div>${day}</div>
                ${isActive ? '<div style="width:5px; height:5px; background:var(--orange); border-radius:50%; margin:2px auto 0 auto;"></div>' : ''}
            `;
            calendarGrid.appendChild(cell);
        }
    }
}

// ==========================================
// ACHIEVEMENTS BADGES
// ==========================================
function renderAchievements() {
    const grid = document.getElementById("achievementsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const xpData = JSON.parse(localStorage.getItem("studyBuddyXP")) || { totalXP: 0 };
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessionsLog")) || [];
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];

    const currentStreak = calculateCurrentStreak(sessions);
    const totalMins = sessions.reduce((sum, s) => sum + s.duration, 0);

    const badges = [
        {
            name: "Java Master",
            desc: "Understand Object Oriented principles in Java.",
            condition: "Review Java subject folder contents.",
            unlocked: subjects.some(s => s.name.toLowerCase().includes("cs") || s.name.toLowerCase().includes("java"))
        },
        {
            name: "React Explorer",
            desc: "Perform dynamic component learning exercises.",
            condition: "Unlocked when overall progress exceeds 20%.",
            unlocked: completedTasksCountForSubject(subjects) >= 2
        },
        {
            name: "AI Beginner",
            desc: "Start learning from AI Tutor chatbot module.",
            condition: "Write at least one prompt message to tutor.",
            unlocked: (JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || []).length > 2
        },
        {
            name: "7 Day Streak",
            desc: "Study consecutively for 7 days to reinforce memory.",
            condition: "Streak count equals 7 or more.",
            unlocked: currentStreak >= 7
        },
        {
            name: "30 Day Streak",
            desc: "Establish long-term retention habits.",
            condition: "Streak count equals 30.",
            unlocked: currentStreak >= 30
        },
        {
            name: "Fast Learner",
            desc: "Complete study planner items on your dashboard.",
            condition: "Finish at least 3 checklist items.",
            unlocked: completedTasksCountForSubject(subjects) >= 3
        },
        {
            name: "Quiz Champion",
            desc: "Clear subject assessments.",
            condition: "Earn XP points via quiz results.",
            unlocked: xpData.totalXP >= 500
        }
    ];

    badges.forEach(b => {
        const card = document.createElement("div");
        card.className = "card subject-card";
        if (!b.unlocked) {
            card.style.opacity = "0.5";
            card.style.filter = "grayscale(100%)";
        }
        
        card.innerHTML = `
            <div class="subject-icon" style="background:${b.unlocked ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.05)'}; color:${b.unlocked ? '#facc15' : 'var(--text-secondary)'}; font-size:24px; width:50px; height:50px;">
                <i class="fa-solid ${b.unlocked ? 'fa-medal' : 'fa-lock'}"></i>
            </div>
            <h3>${b.name}</h3>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px; line-height:1.3;">${b.desc}</p>
            <div style="font-size:10px; color:${b.unlocked ? 'var(--teal)' : 'var(--orange)'}; font-weight:700;">
                ${b.unlocked ? 'Unlocked: June 20, 2026' : `Condition: ${b.condition}`}
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// XP POINTS SYSTEM
// ==========================================
function getLevelFromXP(xp) {
    if (xp >= 1000) return 4;
    if (xp >= 500) return 3;
    if (xp >= 250) return 2;
    return 1;
}

function getXPThreshold(level) {
    if (level === 1) return 250;
    if (level === 2) return 500;
    if (level === 3) return 1000;
    return 2000;
}

window.awardXP = function(points, description) {
    const xpData = JSON.parse(localStorage.getItem("studyBuddyXP")) || { totalXP: 0, history: [] };
    const oldLevel = getLevelFromXP(xpData.totalXP);
    
    xpData.totalXP += points;
    if (!xpData.history) xpData.history = [];
    xpData.history.unshift({
        id: `xp_${Date.now()}`,
        points: points,
        description: description,
        time: new Date().toISOString()
    });

    localStorage.setItem("studyBuddyXP", JSON.stringify(xpData));

    const newLevel = getLevelFromXP(xpData.totalXP);
    if (newLevel > oldLevel) {
        alert(`🎉 Level Up! You reached Level ${newLevel}!`);
    }

    updateDynamicMetrics();
};

function renderXPView() {
    const xpData = JSON.parse(localStorage.getItem("studyBuddyXP")) || { totalXP: 0, history: [] };
    
    document.getElementById("xpViewPoints").textContent = `${xpData.totalXP} XP`;
    const level = getLevelFromXP(xpData.totalXP);
    document.getElementById("xpViewLevel").textContent = level;

    // Progress Bar details
    const currentLvlThreshold = level === 1 ? 0 : (level === 2 ? 100 : (level === 3 ? 250 : 500));
    const nextLvlThreshold = getXPThreshold(level);
    const range = nextLvlThreshold - currentLvlThreshold;
    const progress = xpData.totalXP - currentLvlThreshold;
    const percent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));

    document.getElementById("xpViewProgressBar").style.width = `${percent}%`;
    document.getElementById("xpNextLevelText").textContent = `${xpData.totalXP} / ${nextLvlThreshold} XP (to Level ${level + 1})`;

    // Render XP History
    const list = document.getElementById("xpHistoryList");
    if (list) {
        list.innerHTML = "";
        const history = xpData.history || [];
        if (history.length === 0) {
            list.innerHTML = `<p style="font-size:12px; color:var(--text-secondary);">No XP earned yet.</p>`;
            return;
        }
        history.slice(0, 10).forEach(h => {
            const div = document.createElement("div");
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid rgba(255,255,255,0.04)";
            div.style.fontSize = "12px";
            div.innerHTML = `
                <span>${h.description}</span>
                <strong style="color:var(--teal);">+${h.points} XP</strong>
            `;
            list.appendChild(div);
        });
    }
}

// ==========================================
// REAL CALENDAR MODULE
// ==========================================
function renderCalendarGrid() {
    const grid = document.getElementById("calendarDaysGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const monthYearText = document.getElementById("calendarMonthYear");
    
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    // Set Header label
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthYearText.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Render empty pads
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day empty";
        grid.appendChild(cell);
    }

    const plans = JSON.parse(localStorage.getItem("studyBuddyCalendarPlans")) || {};

    // Render days
    for (let day = 1; day <= totalDays; day++) {
        const cellStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayPlans = plans[cellStr] || [];

        const cell = document.createElement("div");
        cell.style.padding = "8px";
        cell.style.borderRadius = "8px";
        cell.style.background = cellStr === calendarSelectedDateStr ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.02)";
        cell.style.border = cellStr === calendarSelectedDateStr ? "1.5px solid var(--primary)" : "1px solid rgba(255,255,255,0.05)";
        cell.style.cursor = "pointer";
        cell.style.display = "flex";
        cell.style.flexDirection = "column";
        cell.style.justifyContent = "space-between";
        cell.style.position = "relative";
        cell.style.minHeight = "45px";

        cell.innerHTML = `
            <span style="font-weight:700; font-size:12px;">${day}</span>
            ${dayPlans.length > 0 ? `<span style="width:6px; height:6px; background:var(--teal); border-radius:50%; align-self:center; margin-bottom:2px;"></span>` : ''}
        `;

        cell.onclick = () => {
            calendarSelectedDateStr = cellStr;
            renderCalendarGrid();
            renderSelectedDatePlans();
        };

        grid.appendChild(cell);
    }
}

window.prevCalendarMonth = function() {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    renderCalendarGrid();
};

window.nextCalendarMonth = function() {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    renderCalendarGrid();
};

function selectCalendarDate(dateObj) {
    calendarSelectedDateStr = dateObj.toISOString().split('T')[0];
    renderSelectedDatePlans();
}

function renderSelectedDatePlans() {
    const dateText = document.getElementById("calendarSelectedDateText");
    if (!dateText) return;

    dateText.textContent = calendarSelectedDateStr;
    document.getElementById("calendarPlanAddForm").style.display = "block";

    const plans = JSON.parse(localStorage.getItem("studyBuddyCalendarPlans")) || {};
    const dayPlans = plans[calendarSelectedDateStr] || [];

    const container = document.getElementById("calendarPlanList");
    container.innerHTML = "";

    if (dayPlans.length === 0) {
        container.innerHTML = `<p style="font-size:12px; color:var(--text-secondary);">No plans scheduled for this date.</p>`;
        return;
    }

    dayPlans.forEach(plan => {
        const item = document.createElement("div");
        item.style.background = "rgba(255,255,255,0.02)";
        item.style.border = "1px solid rgba(255,255,255,0.05)";
        item.style.padding = "10px 14px";
        item.style.borderRadius = "8px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.fontSize = "12px";

        item.innerHTML = `
            <div>
                <strong>${plan.subject}</strong>
                <span style="display:block; font-size:10px; color:var(--text-secondary);">${plan.minutes} mins</span>
            </div>
            <button class="btn-upgrade" onclick="deleteCalendarPlanItem('${plan.id}')" style="background:transparent; color:#ef4444; width:auto; padding:5px;"><i class="fa-solid fa-trash-can"></i></button>
        `;
        container.appendChild(item);
    });
}

window.saveCalendarPlanItem = function() {
    const subject = document.getElementById("calendarPlanSubject").value.trim();
    const minutes = parseInt(document.getElementById("calendarPlanMinutes").value) || 25;

    if (!subject) {
        alert("Please enter subject name!");
        return;
    }

    const plans = JSON.parse(localStorage.getItem("studyBuddyCalendarPlans")) || {};
    if (!plans[calendarSelectedDateStr]) plans[calendarSelectedDateStr] = [];

    plans[calendarSelectedDateStr].push({
        id: `plan_${Date.now()}`,
        subject: subject,
        minutes: minutes
    });

    localStorage.setItem("studyBuddyCalendarPlans", JSON.stringify(plans));
    document.getElementById("calendarPlanSubject").value = "";

    awardXP(15, `Scheduled study calendar plan: ${subject}`);
    renderCalendarGrid();
    renderSelectedDatePlans();
    updateDynamicMetrics();
};

window.deleteCalendarPlanItem = function(planId) {
    const plans = JSON.parse(localStorage.getItem("studyBuddyCalendarPlans")) || {};
    if (plans[calendarSelectedDateStr]) {
        plans[calendarSelectedDateStr] = plans[calendarSelectedDateStr].filter(p => p.id !== planId);
        if (plans[calendarSelectedDateStr].length === 0) {
            delete plans[calendarSelectedDateStr];
        }
        localStorage.setItem("studyBuddyCalendarPlans", JSON.stringify(plans));
        renderCalendarGrid();
        renderSelectedDatePlans();
        updateDynamicMetrics();
    }
};

// ==========================================
// DYNAMIC LEADERBOARD
// ==========================================
function renderLeaderboard() {
    const tbody = document.getElementById("leaderboardTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const leaders = JSON.parse(localStorage.getItem("studyBuddyLeaderboardMock")) || [];
    const profile = JSON.parse(localStorage.getItem("studyBuddyProfile")) || {};
    const xpData = JSON.parse(localStorage.getItem("studyBuddyXP")) || { totalXP: 0 };
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessionsLog")) || [];

    const userMins = sessions.reduce((sum, s) => sum + s.duration, 0);
    const userHours = Math.round(userMins / 60);
    const userStreak = calculateCurrentStreak(sessions);

    // Merge User statistics into leaderboard
    const userRow = {
        name: `${profile.name || 'User'} (You)`,
        points: xpData.totalXP,
        streak: userStreak,
        hours: userHours,
        topBadge: xpData.totalXP >= 500 ? "Quiz Champion" : "Fast Learner",
        isUser: true
    };

    const combined = [...leaders, userRow];
    
    // Sort combined ranking list by points descending
    combined.sort((a,b) => b.points - a.points);

    combined.forEach((player, index) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.04)";
        if (player.isUser) {
            tr.style.background = "rgba(139, 92, 246, 0.1)";
            tr.style.borderLeft = "3px solid var(--primary)";
        }
        
        tr.innerHTML = `
            <td style="padding:12px; font-weight:700;">${index + 1}</td>
            <td style="padding:12px; font-weight:${player.isUser ? '700' : 'normal'};">${player.name}</td>
            <td style="padding:12px; color:var(--teal); font-weight:700;">${player.points} XP</td>
            <td style="padding:12px;">${player.streak} days</td>
            <td style="padding:12px;">${player.hours} hours</td>
            <td style="padding:12px;"><span class="badge-achievement badge-fast-learner" style="font-size:10px;">${player.topBadge}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// NOTES FILE UPLOAD WIDGET
// ==========================================
function renderNotesList() {
    const list = document.getElementById("summarizedNotesList");
    if (!list) return;
    list.innerHTML = "";

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const selector = document.getElementById("notesSubjectSelector");
    
    // Populate notes subject dropdown
    if (selector && selector.innerHTML === "") {
        selector.innerHTML = "";
        subjects.forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub.id;
            opt.textContent = sub.name;
            selector.appendChild(opt);
        });
    }

    const activeFolderSubjectId = selector ? selector.value : (subjects[0] ? subjects[0].id : null);
    if (!activeFolderSubjectId) {
        list.innerHTML = `<p style="font-size:12px; color:var(--text-secondary); text-align:center;">Please create a subject folder first.</p>`;
        return;
    }

    const notes = JSON.parse(localStorage.getItem("studyBuddyNotesList")) || [];
    const filteredNotes = notes.filter(n => n.subjectId === activeFolderSubjectId);

    // Update Counter
    document.getElementById("notesCountText").textContent = `${filteredNotes.length} / 20`;

    if (filteredNotes.length === 0) {
        list.innerHTML = `<p style="font-size:12px; color:var(--text-secondary); text-align:center; padding: 20px;">No lecture files uploaded in this subject folder.</p>`;
        return;
    }

    filteredNotes.forEach(note => {
        const item = document.createElement("div");
        item.className = "note-item";
        item.innerHTML = `
            <div class="note-header" style="align-items:center;">
                <h4 style="font-size:13px; font-weight:700;"><i class="fa-solid fa-file-pdf" style="color:#ef4444; margin-right:6px;"></i>${note.name}</h4>
                <small style="color:var(--text-secondary);">${note.uploadDate}</small>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span style="font-size:10px; color:var(--text-secondary);">Size: ${note.size}</span>
                <div style="display:flex; gap:6px;">
                    <button class="btn-continue" onclick="downloadNoteFile('${note.name}')" style="width:auto; padding:4px 8px; font-size:10px;">Download</button>
                    <button class="btn-upgrade" onclick="deleteNoteFile('${note.id}')" style="background:#ef4444; width:auto; padding:4px 8px; font-size:10px;">Delete</button>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

window.handleNotesFileUpload = function(input) {
    const file = input.files[0];
    if (!file) return;

    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    const notes = JSON.parse(localStorage.getItem("studyBuddyNotesList")) || [];
    
    const activeFolderSubjectId = document.getElementById("notesSubjectSelector").value;
    const filteredNotes = notes.filter(n => n.subjectId === activeFolderSubjectId);

    if (filteredNotes.length >= 20) {
        alert("Upload failed. Subject folder limit exceeded (Max 20 files per subject).");
        return;
    }

    const newNote = {
        id: `note_${Date.now()}`,
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: file.type || "application/octet-stream",
        uploadDate: new Date().toISOString().split('T')[0],
        subjectId: activeFolderSubjectId
    };

    notes.push(newNote);
    localStorage.setItem("studyBuddyNotesList", JSON.stringify(notes));

    awardXP(30, `Uploaded file: ${file.name}`);
    alert("File uploaded and saved locally!");
    
    renderNotesList();
    updateDynamicMetrics();
};

window.downloadNoteFile = function(fileName) {
    // Generate simulated download triggers
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ note: "Simulated contents for " + fileName }));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", fileName);
    dlAnchorElem.click();
};

window.deleteNoteFile = function(noteId) {
    let notes = JSON.parse(localStorage.getItem("studyBuddyNotesList")) || [];
    notes = notes.filter(n => n.id !== noteId);
    localStorage.setItem("studyBuddyNotesList", JSON.stringify(notes));
    renderNotesList();
    updateDynamicMetrics();
};

// ==========================================
// COMPREHENSIVE QUIZ GENERATOR
// ==========================================
window.generateComprehensiveQuiz = function() {
    const topicName = document.getElementById("quizTopicName").value.trim();
    const count = parseInt(document.getElementById("quizTopicCount").value) || 10;
    const difficulty = document.getElementById("quizTopicDifficulty").value;

    if (!topicName) {
        alert("Please enter a Topic Name!");
        return;
    }

    // Set questions list
    activeQuizQuestions = [];
    activeQuizQuestionIdx = 0;
    activeQuizScore = 0;

    // Build simulated questions
    for (let i = 1; i <= count; i++) {
        const typeRand = i % 3; // 0=MCQ, 1=TF, 2=Text
        if (typeRand === 0) {
            activeQuizQuestions.push({
                type: "mcq",
                question: `[MCQ] In ${topicName} (difficulty: ${difficulty}), what does principle ${i} dictate?`,
                options: ["Option A: Primary statement", "Option B: Secondary alternative", "Option C: Null parameters", "Option D: Default behavior"],
                correct: "Option A: Primary statement",
                explanation: `Option A is correct because in ${topicName}, primary declarations govern properties.`
            });
        } else if (typeRand === 1) {
            activeQuizQuestions.push({
                type: "tf",
                question: `[True/False] The declaration sequence of ${topicName} is synchronous?`,
                options: ["True", "False"],
                correct: "True",
                explanation: "Correct. Declarations are parsed in order."
            });
        } else {
            activeQuizQuestions.push({
                type: "text",
                question: `[Text] Define the core utility parameter for ${topicName}:`,
                correct: "utility",
                explanation: "The correct term is utility."
            });
        }
    }

    // Hide config, show play
    document.getElementById("quizConfigPanel").style.display = "none";
    document.getElementById("quizContainer").style.display = "block";
    document.getElementById("quizResultPanel").style.display = "none";

    renderQuizQuestionPlay();
};

function renderQuizQuestionPlay() {
    const q = activeQuizQuestions[activeQuizQuestionIdx];
    
    // Header text
    document.getElementById("quizPlayProgress").textContent = `Question ${activeQuizQuestionIdx + 1} of ${activeQuizQuestions.length}`;
    document.getElementById("quizQuestion").textContent = q.question;

    // Reset controls
    document.getElementById("quizFeedback").style.display = "none";
    document.getElementById("quizTextInputField").value = "";

    const optsContainer = document.getElementById("quizOptionsContainer");
    optsContainer.innerHTML = "";

    if (q.type === "text") {
        document.getElementById("quizTextAnswerInput").style.display = "block";
    } else {
        document.getElementById("quizTextAnswerInput").style.display = "none";
        
        q.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "btn-outline option-btn";
            btn.textContent = opt;
            btn.onclick = () => selectQuizAnswer(opt);
            optsContainer.appendChild(btn);
        });
    }
}

function selectQuizAnswer(val) {
    const q = activeQuizQuestions[activeQuizQuestionIdx];
    const isCorrect = val === q.correct;
    
    if (isCorrect) activeQuizScore++;

    showQuizFeedback(isCorrect, q.correct, q.explanation);
}

window.submitTextQuizAnswer = function() {
    const val = document.getElementById("quizTextInputField").value.trim().toLowerCase();
    const q = activeQuizQuestions[activeQuizQuestionIdx];
    const isCorrect = val.includes(q.correct.toLowerCase());

    if (isCorrect) activeQuizScore++;

    showQuizFeedback(isCorrect, q.correct, q.explanation);
};

function showQuizFeedback(isCorrect, correctStr, explanationStr) {
    const feedback = document.getElementById("quizFeedback");
    const result = document.getElementById("quizFeedbackResult");
    const explanation = document.getElementById("quizFeedbackExplanation");

    feedback.style.display = "block";
    
    if (isCorrect) {
        result.textContent = "Correct! Well done.";
        result.style.color = "#22c55e";
    } else {
        result.textContent = `Incorrect. Correct answer: ${correctStr}`;
        result.style.color = "#ef4444";
    }
    
    explanation.textContent = explanationStr;
}

window.advanceQuizQuestion = function() {
    activeQuizQuestionIdx++;
    if (activeQuizQuestionIdx < activeQuizQuestions.length) {
        renderQuizQuestionPlay();
    } else {
        // Quiz completed
        document.getElementById("quizContainer").style.display = "none";
        document.getElementById("quizResultPanel").style.display = "block";
        document.getElementById("quizResultScore").textContent = `${activeQuizScore} / ${activeQuizQuestions.length}`;

        awardXP(activeQuizScore * 30, `Completed comprehensive topic quiz`);
        updateDynamicMetrics();
    }
}

window.exitQuizToConfig = function() {
    document.getElementById("quizConfigPanel").style.display = "grid";
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("quizResultPanel").style.display = "none";

    document.getElementById("quizTopicName").value = "";
    document.getElementById("quizTopicDesc").value = "";
};

// ==========================================
// AI TUTOR CHAT MODULE (Memory Driven)
// ==========================================
function renderRecentChats() {
    const chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];
    
    // Render in dashboard chats widget
    const dbMessages = document.getElementById("dashboardChatMessages");
    if (dbMessages) {
        dbMessages.innerHTML = "";
        chatHistory.forEach(msg => {
            const div = document.createElement("div");
            div.className = `chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;
            div.innerHTML = msg.text;
            dbMessages.appendChild(div);
        });
        dbMessages.scrollTop = dbMessages.scrollHeight;
    }

    // Render in AI Tutor chats widget
    const tutorMessages = document.getElementById("tutorChatMessages");
    if (tutorMessages) {
        tutorMessages.innerHTML = "";
        chatHistory.forEach(msg => {
            const div = document.createElement("div");
            div.className = `chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;
            div.innerHTML = msg.text;
            tutorMessages.appendChild(div);
        });
        tutorMessages.scrollTop = tutorMessages.scrollHeight;
    }
}

window.clearChatLogs = function() {
    if (!confirm("Clear whole tutor chat conversation logs?")) return;
    localStorage.setItem("studyBuddyChatHistory", JSON.stringify([]));
    renderRecentChats();
};

// Handle mock file uploads onto chats
window.handleChatFileUpload = function(input, type) {
    const file = input.files[0];
    if (!file) return;

    let chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];
    chatHistory.push({
        sender: "user",
        text: `📎 Attached lecture file: <strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB)`,
        time: new Date().toISOString()
    });

    localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatHistory));
    renderRecentChats();

    // AI dynamic feedback matching file content
    setTimeout(() => {
        let reply = `I've analyzed the uploaded file <strong>${file.name}</strong>. It contains definitions matching your favorite subject resources. Ask me questions about it!`;
        
        chatHistory.push({
            sender: "bot",
            text: reply,
            time: new Date().toISOString()
        });
        localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatHistory));
        renderRecentChats();
        speakText(reply);
    }, 1200);
};

// Send User Message
function sendChatMessage(text) {
    if (!text || !text.trim()) return;

    let chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];
    chatHistory.push({
        sender: "user",
        text: text.trim(),
        time: new Date().toISOString()
    });

    localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatHistory));
    renderRecentChats();

    // Trigger AI Agent Memory Response
    setTimeout(() => {
        const reply = generateAIMemoryResponse(text);
        
        chatHistory.push({
            sender: "bot",
            text: reply,
            time: new Date().toISOString()
        });
        localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatHistory));
        renderRecentChats();
        
        // Triggers voice output if sound toggled on
        speakText(reply);

        awardXP(10, "Asked question to Memory Tutor");
    }, 1000);
}

function generateAIMemoryResponse(userInput) {
    const profile = JSON.parse(localStorage.getItem("studyBuddyProfile")) || {};
    const input = userInput.toLowerCase();

    const name = profile.name || "Alex";
    const weak = profile.weakSubject || "Java";
    const career = profile.careerGoal || "Full Stack Developer";
    const fav = profile.favSubject || "Computer Science";

    if (input.includes("struggle") || input.includes("weak") || input.includes("difficult") || input.includes(weak.toLowerCase())) {
        return `I remember **${weak}** is your weak subject. For a future **${career}**, I suggest:<br>• Review OOP interface patterns<br>• Practice with a 10-question quiz in Subjects.`;
    }

    if (input.includes("career") || input.includes("goal") || input.includes("job")) {
        return `Since your career goal is to become a **${career}**, prioritize coding sessions and building full stack projects. Make sure to log sessions in the Planner.`;
    }

    if (input.includes("favorite") || input.includes("love") || input.includes(fav.toLowerCase())) {
        return `I know you love **${fav}**! That's a great match for a **${career}**. Check your calendar to schedule next study sessions.`;
    }

    return `Hello **${name}**! I'm tracking your profile details. I remember your target career is to be a **${career}** and you want to overcome challenges in **${weak}**. What topic should we study?`;
}

// Chat Forms Bindings
const tutorChatForm = document.getElementById("tutorChatForm");
if (tutorChatForm) {
    tutorChatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("tutorChatInput");
        const val = input.value;
        input.value = "";
        sendChatMessage(val);
    });
}

const dashboardChatForm = document.getElementById("dashboardChatForm");
if (dashboardChatForm) {
    dashboardChatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("dashboardChatInput");
        const val = input.value;
        input.value = "";
        sendChatMessage(val);
    });
}

// ==========================================
// VOICE CONTROLS (Speech Recognition & Synthesis)
// ==========================================
function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Append text to chat inputs
        const tutorInput = document.getElementById("tutorChatInput");
        const dbInput = document.getElementById("dashboardChatInput");
        
        if (tutorInput) tutorInput.value = transcript;
        if (dbInput) dbInput.value = transcript;

        alert(`Voice captured: "${transcript}"`);
    };

    recognition.onerror = () => {
        isRecording = false;
        alert("Voice recognition error or permission denied.");
    };

    recognition.onend = () => {
        isRecording = false;
        document.querySelectorAll(".btn-chat-mic").forEach(btn => btn.style.color = "var(--text-secondary)");
    };
}

window.toggleVoiceInput = function(type) {
    if (!recognition) {
        alert("Web Speech recognition not supported in this browser.");
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        isRecording = true;
        const btn = type === 'tutor' ? document.getElementById("tutorChatVoiceBtn") : document.getElementById("dashboardChatVoiceBtn");
        if (btn) btn.style.color = "#ef4444";
        recognition.start();
    }
};

function speakText(text) {
    // Check if voice output sound settings are toggled
    const soundToggle = document.getElementById("settingsSound");
    if (soundToggle && !soundToggle.checked) return;

    if ('speechSynthesis' in window) {
        // Strip Markdown HTML tags
        const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "").replace(/\*\*/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// ==========================================
// POMODORO TIMER WORKSPACES
// ==========================================

// 1. Dashboard Pomodoro
function initMainPomodoro() {
    const start = document.getElementById("timerStartBtn");
    const pause = document.getElementById("timerPauseBtn");
    if (!start) return;

    start.addEventListener("click", () => {
        if (mainTimerInterval) return;
        mainTimerInterval = setInterval(() => {
            if (mainTimerSeconds <= 0) {
                clearInterval(mainTimerInterval);
                mainTimerInterval = null;
                
                // complete pomo
                alert("Pomodoro complete! +30 XP logged.");
                awardXP(30, "Completed Pomodoro timer session");
                
                logPomodoroSession(mainTimerType === 'work' ? 25 : 5);
                resetPomodoro();
                return;
            }
            mainTimerSeconds--;
            updateMainTimerDisplay();
        }, 1000);
    });

    pause.addEventListener("click", () => {
        if (mainTimerInterval) {
            clearInterval(mainTimerInterval);
            mainTimerInterval = null;
        }
    });
}

window.resetPomodoro = function() {
    if (mainTimerInterval) {
        clearInterval(mainTimerInterval);
        mainTimerInterval = null;
    }
    if (mainTimerType === 'work') mainTimerSeconds = 25 * 60;
    else if (mainTimerType === 'short') mainTimerSeconds = 5 * 60;
    else mainTimerSeconds = 15 * 60;
    updateMainTimerDisplay();
};

window.setTimerType = function(type) {
    mainTimerType = type;
    document.querySelectorAll(".timer-tab").forEach(tab => {
        if (tab.getAttribute("onclick").includes(type)) tab.classList.add("active");
        else tab.classList.remove("active");
    });
    resetPomodoro();
};

function updateMainTimerDisplay() {
    const mins = Math.floor(mainTimerSeconds / 60).toString().padStart(2, '0');
    const secs = (mainTimerSeconds % 60).toString().padStart(2, '0');
    document.getElementById("timerDisplay").textContent = `${mins}:${secs}`;
}

// 2. Subject Detail Timer
window.startSubjectTimer = function() {
    if (subjectTimerInterval) return;

    const minsVal = parseInt(document.getElementById("subjectTimerMins").value) || 25;
    subjectTimerSeconds = minsVal * 60;

    subjectTimerInterval = setInterval(() => {
        if (subjectTimerSeconds <= 0) {
            clearInterval(subjectTimerInterval);
            subjectTimerInterval = null;
            
            alert(`Subject study session complete! +30 XP`);
            awardXP(30, `Completed study session on ${activeSubjectId}`);
            
            logPomodoroSession(minsVal, activeSubjectId);
            renderSubjectDetail(activeSubjectId);
            return;
        }
        subjectTimerSeconds--;
        updateSubjectTimerDisplay();
    }, 1000);
};

window.pauseSubjectTimer = function() {
    if (subjectTimerInterval) {
        clearInterval(subjectTimerInterval);
        subjectTimerInterval = null;
    }
};

window.resetSubjectTimer = function() {
    if (subjectTimerInterval) {
        clearInterval(subjectTimerInterval);
        subjectTimerInterval = null;
    }
    const minsVal = parseInt(document.getElementById("subjectTimerMins").value) || 25;
    subjectTimerSeconds = minsVal * 60;
    updateSubjectTimerDisplay();
};

function updateSubjectTimerDisplay() {
    const mins = Math.floor(subjectTimerSeconds / 60).toString().padStart(2, '0');
    const secs = (subjectTimerSeconds % 60).toString().padStart(2, '0');
    document.getElementById("subjectTimerDisplay").textContent = `${mins}:${secs}`;
}

// 3. Dedicated Pomodoro View page
function initPomoViewSubjectSelector() {
    const selector = document.getElementById("pomoViewSubjectSelector");
    if (!selector) return;
    
    selector.innerHTML = `<option value="">General Study</option>`;
    const subjects = JSON.parse(localStorage.getItem("studyBuddySubjectsList")) || [];
    subjects.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub.id;
        opt.textContent = sub.name;
        selector.appendChild(opt);
    });
}

window.updatePomoViewSubjectLabel = function() {
    const selector = document.getElementById("pomoViewSubjectSelector");
    const title = document.getElementById("pomoViewSubjectTitle");
    if (selector && title) {
        const opt = selector.options[selector.selectedIndex];
        title.textContent = opt ? opt.textContent : "General Study";
    }
};

window.updatePomoViewCustomMinutes = function() {
    const custom = parseInt(document.getElementById("pomoViewCustomMins").value) || 25;
    pomoViewTimerSeconds = custom * 60;
    updatePomoViewDisplay();
};

window.setPomoViewType = function(type) {
    pomoViewTimerType = type;
    document.querySelectorAll(".timer-tab").forEach(tab => {
        if (tab.id === `pomoViewTabWork` && type === 'work') tab.classList.add('active');
        else if (tab.id === `pomoViewTabShort` && type === 'short') tab.classList.add('active');
        else if (tab.id === `pomoViewTabLong` && type === 'long') tab.classList.add('active');
        else tab.classList.remove('active');
    });

    if (type === 'work') {
        const custom = parseInt(document.getElementById("pomoViewCustomMins").value) || 25;
        pomoViewTimerSeconds = custom * 60;
    } else if (type === 'short') {
        pomoViewTimerSeconds = 5 * 60;
    } else {
        pomoViewTimerSeconds = 15 * 60;
    }
    updatePomoViewDisplay();
};

window.startPomoViewTimer = function() {
    if (pomoViewTimerInterval) return;
    
    pomoViewTimerInterval = setInterval(() => {
        if (pomoViewTimerSeconds <= 0) {
            clearInterval(pomoViewTimerInterval);
            pomoViewTimerInterval = null;
            
            alert("Pomodoro view session complete! +30 XP.");
            
            const selector = document.getElementById("pomoViewSubjectSelector");
            const subId = selector ? selector.value : "";
            
            awardXP(30, "Completed dedicated Pomodoro session");
            logPomodoroSession(Math.round(pomoViewTimerSeconds / 60) || 25, subId);
            
            resetPomoViewTimer();
            return;
        }
        pomoViewTimerSeconds--;
        updatePomoViewDisplay();
    }, 1000);
};

window.pausePomoViewTimer = function() {
    if (pomoViewTimerInterval) {
        clearInterval(pomoViewTimerInterval);
        pomoViewTimerInterval = null;
    }
};

window.resetPomoViewTimer = function() {
    if (pomoViewTimerInterval) {
        clearInterval(pomoViewTimerInterval);
        pomoViewTimerInterval = null;
    }
    setPomoViewType(pomoViewTimerType);
};

function updatePomoViewDisplay() {
    const mins = Math.floor(pomoViewTimerSeconds / 60).toString().padStart(2, '0');
    const secs = (pomoViewTimerSeconds % 60).toString().padStart(2, '0');
    document.getElementById("pomoViewDisplay").textContent = `${mins}:${secs}`;
}

function logPomodoroSession(durationMins, subjectId = "") {
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessionsLog")) || [];
    sessions.push({
        id: `session_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        duration: durationMins,
        subjectId: subjectId
    });
    localStorage.setItem("studyBuddySessionsLog", JSON.stringify(sessions));
    loadAllData();
}

// ==========================================
// PROFILE CONFIGURATION SUBMIT & AVATARS
// ==========================================
window.selectPresetAvatar = function(imgEl) {
    document.querySelectorAll(".avatar-option").forEach(opt => opt.classList.remove("selected"));
    imgEl.classList.add("selected");
};

const profileForm = document.getElementById("profileForm");
if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const department = document.getElementById("department").value.trim();
        const weakSubject = document.getElementById("weakSubject").value.trim();
        const careerGoal = document.getElementById("careerGoal").value.trim();
        const favSubject = document.getElementById("favSubject").value.trim();
        const studyPreference = document.getElementById("studyPreference").value.trim();

        // Get selected avatar preset
        const selectedAvatar = document.querySelector(".avatar-option.selected");
        const avatarSrc = selectedAvatar ? selectedAvatar.src : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80";

        const profile = { name, department, weakSubject, careerGoal, favSubject, studyPreference, avatarSrc };
        localStorage.setItem("studyBuddyProfile", JSON.stringify(profile));

        awardXP(50, "Updated Profile configuration parameters");
        alert("Student memory profile saved!");
        
        loadAllData();
        switchTab('dashboard');
    });
}

window.exportProfileData = function() {
    const profile = localStorage.getItem("studyBuddyProfile");
    if (!profile) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(profile);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "studybuddy-profile-backup.json");
    dlAnchorElem.click();
};

window.deleteProfileConfirm = function() {
    if (!confirm("Are you sure you want to delete your student profile? This will lock dashboard items.")) return;
    localStorage.removeItem("studyBuddyProfile");
    loadAllData();
    switchTab('profile');
};

// ==========================================
// SETTINGS SYSTEM ACTIONS
// ==========================================
window.exportApplicationData = function() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("studyBuddy")) {
            backup[key] = localStorage.getItem(key);
        }
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "studybuddy-full-database-backup.json");
    dlAnchor.click();
};

window.importApplicationData = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            Object.keys(backup).forEach(key => {
                localStorage.setItem(key, backup[key]);
            });
            alert("Backup imported successfully! Page will now reload.");
            window.location.reload();
        } catch (err) {
            alert("Import failed. Invalid JSON structure file.");
        }
    };
    reader.readAsText(file);
};

window.resetApplicationData = function() {
    if (!confirm("Caution: This will permanently delete all subjects, files, calendars, and progress scores. Proceed?")) return;
    
    // Clear studyBuddy items
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith("studyBuddy")) {
            localStorage.removeItem(key);
        }
    }

    alert("Data reset successfully. Application will now reload.");
    window.location.reload();
};