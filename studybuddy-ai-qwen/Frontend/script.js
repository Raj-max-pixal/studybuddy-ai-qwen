// ==========================
// DOM ELEMENTS
// ==========================
const profileForm = document.getElementById("profileForm");
const profileStatusText = document.getElementById("profileStatusText");

// Theme Toggle
const themeToggle = document.getElementById("themeToggle");

// Circular Progress Gauge
const healthCircleRing = document.getElementById("healthCircleRing");
const healthGaugeValue = document.getElementById("healthGaugeValue");
const streakVal = document.getElementById("streakVal");

// Pomodoro Timer
const timerDisplay = document.getElementById("timerDisplay");
const timerStartBtn = document.getElementById("timerStartBtn");
const timerPauseBtn = document.getElementById("timerPauseBtn");

// Statistics
const statEntries = document.getElementById("statEntries");
const statSessions = document.getElementById("statSessions");
const statWeak = document.getElementById("statWeak");
const statProjects = document.getElementById("statProjects");

// Lists & View Bindings
const memoryInsightsList = document.getElementById("memoryInsightsList");
const timelineList = document.getElementById("timelineList");
const dashboardPlanList = document.getElementById("dashboardPlanList");
const projectSuggestionsList = document.getElementById("projectSuggestionsList");
const completedTasksVal = document.getElementById("completedTasksVal");

// Chat Elements
const tutorChatMessages = document.getElementById("tutorChatMessages");
const tutorChatForm = document.getElementById("tutorChatForm");
const tutorChatInput = document.getElementById("tutorChatInput");

// ==========================
// GLOBALS & STATE
// ==========================
let timerInterval = null;
let timerSeconds = 25 * 60; // 25 minutes default

// SVG Ring Configuration
const ringRadius = 48;
const ringCircumference = 2 * Math.PI * ringRadius;

// ==========================
// PAGE INITIALIZATION
// ==========================
window.addEventListener("load", () => {
    // Initialize SVG circumference
    if (healthCircleRing) {
        healthCircleRing.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
        healthCircleRing.style.strokeDashoffset = ringCircumference;
    }

    // Initialize Theme
    initTheme();

    // Initialize App State
    initApp();

    // Initialize Pomodoro Control Listeners
    initPomodoro();
});

// ==========================
// TAB ROUTING (SPA)
// ==========================
window.switchTab = function(tabId) {
    // Hide all views
    const views = document.querySelectorAll(".tab-view");
    views.forEach(view => {
        view.classList.remove("active");
    });

    // Show targeted view
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) {
        targetView.classList.add("active");
    }

    // Update main header nav active states
    const navItems = document.querySelectorAll(".app-header .nav-item");
    navItems.forEach(item => {
        if (item.getAttribute("data-tab") === tabId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Update sidebar nav active states inside AI tutor view
    const sidebarItems = document.querySelectorAll(".tutor-sidebar .sidebar-nav li");
    sidebarItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(tabId === 'ai-tutor' ? 'ai tutor' : tabId)) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Scroll to top of view
    window.scrollTo({ top: 0, behavior: "smooth" });
};

// Scroll and focus profile form
window.focusProfile = function() {
    switchTab('profile');
    setTimeout(() => {
        const nameInput = document.getElementById("name");
        if (nameInput) {
            nameInput.focus();
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const card = document.getElementById("profileCard");
            if (card) {
                card.style.borderColor = "#2563eb";
                card.style.boxShadow = "0 0 20px rgba(37, 99, 235, 0.4)";
                setTimeout(() => {
                    card.style.borderColor = "";
                    card.style.boxShadow = "";
                }, 1500);
            }
        }
    }, 300);
};

// ==========================
// THEME SWITCHER
// ==========================
function initTheme() {
    const isDark = localStorage.getItem("studyBuddyDarkTheme") === "true";
    if (isDark) {
        document.body.classList.add("dark-theme");
        themeToggle.checked = true;
    } else {
        document.body.classList.remove("dark-theme");
        themeToggle.checked = false;
    }

    themeToggle.addEventListener("change", () => {
        if (themeToggle.checked) {
            document.body.classList.add("dark-theme");
            localStorage.setItem("studyBuddyDarkTheme", "true");
        } else {
            document.body.classList.remove("dark-theme");
            localStorage.setItem("studyBuddyDarkTheme", "false");
        }
    });
}

// ==========================
// APP MEMORY CONTROLLER
// ==========================
function initApp() {
    const savedData = localStorage.getItem("studyBuddyProfile");
    
    if (!savedData) {
        toggleEmptyStates(false);
        return;
    }
    
    toggleEmptyStates(true);
    loadUserData();
}

function toggleEmptyStates(hasProfile) {
    const emptyStates = document.querySelectorAll(".empty-state");
    const contentStates = document.querySelectorAll(".content-state");
    
    if (hasProfile) {
        emptyStates.forEach(el => el.style.display = "none");
        contentStates.forEach(el => el.style.display = "block");
        if (profileStatusText) profileStatusText.textContent = "Memory Profile Active";
    } else {
        emptyStates.forEach(el => el.style.display = "flex");
        contentStates.forEach(el => el.style.display = "none");
        if (profileStatusText) profileStatusText.textContent = "No memory profile created yet";
        
        // Clear inputs on reset
        document.getElementById("name").value = "";
        document.getElementById("department").value = "";
        document.getElementById("weakSubject").value = "";
        document.getElementById("careerGoal").value = "";
    }
}

// ==========================
// SAVE PROFILE
// ==========================
if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const department = document.getElementById("department").value.trim() || "Computer Science";
        const weakSubject = document.getElementById("weakSubject").value.trim() || "Java";
        const careerGoal = document.getElementById("careerGoal").value.trim() || "Full Stack AI Developer";

        if (!name) {
            alert("Please enter a name.");
            return;
        }

        const studentData = { name, department, weakSubject, careerGoal };
        localStorage.setItem("studyBuddyProfile", JSON.stringify(studentData));
        
        // Initialize sessions, chat logs, and checklists
        initializeMockMemory(name, weakSubject, careerGoal);

        // Record profile save on timeline
        addTimelineEvent(`${name} updated memory profile preferences`, new Date().toISOString());

        // Toggle page states and reload
        toggleEmptyStates(true);
        loadUserData();
        
        alert("Memory profile saved successfully!");
        switchTab('dashboard');
    });
}

function initializeMockMemory(name, weakSubject, careerGoal) {
    // 1. Study Sessions History (16 sessions)
    if (!localStorage.getItem("studyBuddySessions")) {
        const sessions = [];
        const now = new Date();
        
        // 4 sessions in current week (timestamps in the evening)
        for (let i = 0; i < 4; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            date.setHours(19 + i, 15, 0); // Evening hours
            sessions.push({
                event: `Completed study session on ${weakSubject} topics`,
                time: date.toISOString()
            });
        }
        
        // 12 sessions in previous weeks
        for (let i = 4; i < 16; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - i - 2);
            date.setHours(18, 45, 0); // Evening
            sessions.push({
                event: `Session: Practice on ${careerGoal} roadmap`,
                time: date.toISOString()
            });
        }
        
        localStorage.setItem("studyBuddySessions", JSON.stringify(sessions));
    }
    
    // 2. Chat History
    if (!localStorage.getItem("studyBuddyChatHistory")) {
        const chatLogs = [
            { sender: 'bot', text: `Hi ${name}! I'm your MemoryAgent. I remember your career goal is to be a ${careerGoal}.`, time: new Date(Date.now() - 600000).toISOString() },
            { sender: 'user', text: `What is my focus today?`, time: new Date(Date.now() - 500000).toISOString() },
            { sender: 'bot', text: `Today we are focusing on your weak subject, ${weakSubject}, and ${careerGoal} skills! Check your planner.`, time: new Date(Date.now() - 400000).toISOString() }
        ];
        localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatLogs));
    }
    
    // 3. Checklist
    if (!localStorage.getItem("studyBuddyCheckedTasks")) {
        const defaultChecked = [true, true, true, false];
        localStorage.setItem("studyBuddyCheckedTasks", JSON.stringify(defaultChecked));
    }
}

// ==========================
// LOAD DATA
// ==========================
function loadUserData() {
    const savedData = localStorage.getItem("studyBuddyProfile");
    if (!savedData) return;

    const user = JSON.parse(savedData);

    // Populate profile inputs
    document.getElementById("name").value = user.name;
    document.getElementById("department").value = user.department;
    document.getElementById("weakSubject").value = user.weakSubject;
    document.getElementById("careerGoal").value = user.careerGoal;

    // Trigger sub-generators
    generatePersonalizedPlan(user.weakSubject, user.careerGoal);
    generateProjects(user.careerGoal);
    renderTimeline();
    renderChat();
    updateStatsAndInsights(user);
}

// ==========================
// PERSONALIZED PLAN
// ==========================
function generatePersonalizedPlan(weakSubject, careerGoal) {
    const planList = [
        `09:00 AM → ${weakSubject} revision`,
        `10:00 AM → Flashcards`,
        `06:00 PM → ${getTechKeyword(careerGoal)} practice`,
        `08:00 PM → Quiz`
    ];
    
    let checkedTasks = JSON.parse(localStorage.getItem("studyBuddyCheckedTasks")) || [false, false, false, false];
    
    if (checkedTasks.length !== 4) {
        checkedTasks = [false, false, false, false];
    }
    
    dashboardPlanList.innerHTML = "";
    
    planList.forEach((task, idx) => {
        const isCompleted = checkedTasks[idx];
        const li = document.createElement("li");
        if (isCompleted) li.classList.add("completed");
        
        li.innerHTML = `
            <input type="checkbox" id="task-${idx}" ${isCompleted ? 'checked' : ''}>
            <span>${task}</span>
        `;
        
        const checkbox = li.querySelector('input');
        
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTask(idx, checkbox.checked);
        });
        
        li.addEventListener('click', () => {
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleTask(idx, newState);
        });
        
        dashboardPlanList.appendChild(li);
    });
    
    // Update metric visualizer
    const completedCount = checkedTasks.filter(Boolean).length;
    if (completedTasksVal) completedTasksVal.textContent = completedCount;
}

function getTechKeyword(careerGoal) {
    const goalLower = careerGoal.toLowerCase();
    if (goalLower.includes("react")) return "React";
    if (goalLower.includes("java")) return "Java";
    if (goalLower.includes("python")) return "Python";
    if (goalLower.includes("javascript") || goalLower.includes("js")) return "JavaScript";
    if (goalLower.includes("full") || goalLower.includes("web")) return "React";
    if (goalLower.includes("ai") || goalLower.includes("ml") || goalLower.includes("machine")) return "PyTorch/ML";
    return "React";
}

function toggleTask(index, isChecked) {
    let checkedTasks = JSON.parse(localStorage.getItem("studyBuddyCheckedTasks")) || [false, false, false, false];
    checkedTasks[index] = isChecked;
    localStorage.setItem("studyBuddyCheckedTasks", JSON.stringify(checkedTasks));
    
    const planText = [
        `09:00 AM Plan`,
        `10:00 AM Flashcards`,
        `06:00 PM Practice`,
        `08:00 PM Quiz`
    ];
    
    const taskName = planText[index];
    addTimelineEvent(`${isChecked ? 'Completed' : 'Unchecked'} today's plan item: ${taskName}`, new Date().toISOString());
    
    loadUserData();
}

function addTimelineEvent(eventText, timestamp) {
    let sessions = JSON.parse(localStorage.getItem("studyBuddySessions")) || [];
    sessions.unshift({ event: eventText, time: timestamp });
    localStorage.setItem("studyBuddySessions", JSON.stringify(sessions));
}

// ==========================
// PROJECT SUGGESTIONS
// ==========================
function generateProjects(goal) {
    let projects = [];
    const userGoal = goal.toLowerCase();

    if (userGoal.includes("full") || userGoal.includes("web")) {
        projects = [
            "Portfolio Website with Custom CMS",
            "Expense Tracker SaaS Dashboard",
            "Real-time Task Manager Workspace"
        ];
    } else if (userGoal.includes("ai") || userGoal.includes("machine") || userGoal.includes("data")) {
        projects = [
            "AI Chatbot with LLM Integration",
            "StudyBuddy Semantic Memory Agent",
            "Neural Image Classifier Model"
        ];
    } else if (userGoal.includes("cyber") || userGoal.includes("security")) {
        projects = [
            "Password Manager with AES-256",
            "Automated Port Scanner Tool",
            "Enterprise Security Dashboard"
        ];
    } else {
        projects = [
            "Scientific Calculator App",
            "Geographic Weather Tracker",
            "Markdown Notes Organizer"
        ];
    }

    if (projectSuggestionsList) {
        projectSuggestionsList.innerHTML = "";
        projects.forEach(project => {
            const li = document.createElement("li");
            li.textContent = project;
            projectSuggestionsList.appendChild(li);
        });
    }
}

// ==========================
// RENDER TIMELINE
// ==========================
function renderTimeline() {
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessions")) || [];
    timelineList.innerHTML = "";
    
    if (sessions.length === 0) {
        timelineList.innerHTML = "<li>No timeline events recorded.</li>";
        return;
    }
    
    sessions.slice(0, 5).forEach(item => {
        const li = document.createElement("li");
        const dateStr = new Date(item.time).toLocaleString();
        li.innerHTML = `
            ${item.event}
            <small>${dateStr}</small>
        `;
        timelineList.appendChild(li);
    });
}

// ==========================
// STATS & INSIGHTS (Gauges)
// ==========================
function updateStatsAndInsights(user) {
    const sessions = JSON.parse(localStorage.getItem("studyBuddySessions")) || [];
    const chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];
    const checkedTasks = JSON.parse(localStorage.getItem("studyBuddyCheckedTasks")) || [false, false, false, false];
    
    const sessionsCount = sessions.length;
    const weakSubjectsList = user.weakSubject.split(',').map(s => s.trim()).filter(Boolean);
    const weakCount = weakSubjectsList.length;
    const projectsCount = 12;
    
    const entriesCount = 4 + sessionsCount + chatHistory.length + checkedTasks.filter(Boolean).length;
    
    if (statEntries) statEntries.textContent = entriesCount;
    if (statSessions) statSessions.textContent = sessionsCount;
    if (statWeak) statWeak.textContent = weakCount;
    if (statProjects) statProjects.textContent = projectsCount;
    
    // Memory Health Calculation
    const completedTasksCount = checkedTasks.filter(Boolean).length;
    const sessionBonus = Math.min(16, sessionsCount * 1);
    const weakBonus = weakCount > 0 ? 5 : 0;
    const taskBonus = completedTasksCount * 5;
    
    const scoreVal = Math.min(100, Math.max(0, 50 + taskBonus + sessionBonus + weakBonus));
    
    // Update Dashboard SVG Circle Ring Offset
    if (healthCircleRing) {
        const offset = ringCircumference - (scoreVal / 100) * ringCircumference;
        healthCircleRing.style.strokeDashoffset = offset;
        
        // Dynamically color circular indicator stroke
        if (scoreVal >= 80) {
            healthCircleRing.style.stroke = "#22c55e"; // Green
        } else if (scoreVal >= 50) {
            healthCircleRing.style.stroke = "#eab308"; // Yellow
        } else {
            healthCircleRing.style.stroke = "#ef4444"; // Red
        }
    }
    
    if (healthGaugeValue) {
        healthGaugeValue.textContent = `${scoreVal}%`;
    }
    
    if (streakVal) {
        streakVal.textContent = sessionsCount; // Streak equals total dynamic study sessions logged
    }
    
    generateMemoryInsights(sessions, weakSubjectsList, user.careerGoal);
}

function generateMemoryInsights(sessions, weakSubjects, careerGoal) {
    if (!memoryInsightsList) return;
    memoryInsightsList.innerHTML = "";
    
    // Insight 1
    let eveningCount = 0;
    sessions.forEach(s => {
        const hour = new Date(s.time).getHours();
        if (hour >= 17 || hour <= 4) eveningCount++;
    });
    const bestTime = eveningCount >= (sessions.length / 2) ? "You study best in the evening." : "You study best in the morning.";
    
    // Insight 2
    const primaryWeak = weakSubjects[0] || "Java";
    const revisionNotice = `${primaryWeak} needs revision.`;
    
    // Insight 3
    const tech = getTechKeyword(careerGoal);
    const progressNotice = `${tech} progress improved.`;
    
    // Insight 4
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklySessions = sessions.filter(s => new Date(s.time) >= oneWeekAgo).length;
    const weeklyNotice = `You completed ${weeklySessions} study sessions this week.`;
    
    const insights = [bestTime, revisionNotice, progressNotice, weeklyNotice];
    
    insights.forEach(insight => {
        const li = document.createElement("li");
        li.textContent = insight;
        memoryInsightsList.appendChild(li);
    });
}

// ==========================
// AI CHAT CONTROLLER
// ==========================
function renderChat() {
    const chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];
    tutorChatMessages.innerHTML = "";
    
    chatHistory.forEach(msg => {
        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;
        bubble.innerHTML = msg.text;
        tutorChatMessages.appendChild(bubble);
    });
    
    tutorChatMessages.scrollTop = tutorChatMessages.scrollHeight;
}

if (tutorChatForm) {
    tutorChatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = tutorChatInput.value.trim();
        if (!text) return;
        
        let chatHistory = JSON.parse(localStorage.getItem("studyBuddyChatHistory")) || [];
        chatHistory.push({ sender: 'user', text: text, time: new Date().toISOString() });
        
        tutorChatInput.value = "";
        
        localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatHistory));
        renderChat();
        
        // Simulated AI Bot response
        setTimeout(() => {
            const botReply = generateBotReply(text);
            chatHistory.push({ sender: 'bot', text: botReply, time: new Date().toISOString() });
            localStorage.setItem("studyBuddyChatHistory", JSON.stringify(chatHistory));
            
            const savedData = localStorage.getItem("studyBuddyProfile");
            if (savedData) {
                updateStatsAndInsights(JSON.parse(savedData));
            }
            
            renderChat();
        }, 600);
    });
}

function generateBotReply(userInput) {
    const savedData = localStorage.getItem("studyBuddyProfile");
    if (!savedData) return "Please create a profile first so I can retrieve your settings!";
    
    const user = JSON.parse(savedData);
    const input = userInput.toLowerCase();
    
    const name = user.name;
    const weakSubject = user.weakSubject;
    const careerGoal = user.careerGoal;
    const department = user.department;
    
    const weakList = weakSubject.toLowerCase().split(',').map(s => s.trim());
    const matchedWeak = weakList.find(sub => input.includes(sub));
    
    if (matchedWeak || input.includes("struggle") || input.includes("weak") || input.includes("difficult") || input.includes("java")) {
        const targetSubject = matchedWeak ? matchedWeak.charAt(0).toUpperCase() + matchedWeak.slice(1) : weakSubject;
        return `I remember **${targetSubject}** is one of your weak subjects. Today's recommendation:<br>• 20 min OOP revision<br>• 15 min ${targetSubject} flashcards<br>• 10 min coding exercise`;
    }
    
    if (input.includes("career") || input.includes("goal") || input.includes("job") || input.includes("project") || input.includes("recommend")) {
        return `Since your career goal is **${careerGoal}**, I recommend focusing on building projects like the ones suggested in your Project Suggestions. Developing these will help you gain practical experience for your role in ${department}.`;
    }
    
    if (input.includes("plan") || input.includes("schedule") || input.includes("todo") || input.includes("today")) {
        return `Looking at your personalized plan for today, ${name}, you should focus on **${weakSubject}** revision, flashcards, and tech practice. Mark your tasks completed in the planner to boost your Memory Health!`;
    }
    
    if (input.includes("hi") || input.includes("hello") || input.includes("hey") || input.includes("greetings")) {
        return `Hello **${name}**! I remember you are in the **${department}** department aiming to become a **${careerGoal}**. How can I assist you in your studies today?`;
    }
    
    return `I'm monitoring your study profile, **${name}**. I remember your career goal is to be a **${careerGoal}** and your current focus is **${weakSubject}**. Ask me how to improve your memory health or get study recommendations!`;
}

// ==========================
// INTERACTIVE POMODORO TIMER
// ==========================
function initPomodoro() {
    if (!timerStartBtn) return;
    
    timerStartBtn.addEventListener("click", () => {
        if (timerInterval) return; // Already running
        
        timerStartBtn.style.opacity = "0.7";
        timerStartBtn.textContent = "Running...";
        
        timerInterval = setInterval(() => {
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                timerSeconds = 25 * 60; // reset
                timerDisplay.textContent = "25:00";
                timerStartBtn.style.opacity = "1";
                timerStartBtn.textContent = "Start";
                
                alert("Pomodoro session completed! Logged to memory timeline.");
                addTimelineEvent("Completed 25-minute Pomodoro study session", new Date().toISOString());
                
                // Add session log entry
                let sessions = JSON.parse(localStorage.getItem("studyBuddySessions")) || [];
                // Refresh data to update metrics
                const savedData = localStorage.getItem("studyBuddyProfile");
                if (savedData) {
                    updateStatsAndInsights(JSON.parse(savedData));
                    renderTimeline();
                }
                return;
            }
            
            timerSeconds--;
            const mins = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
            const secs = (timerSeconds % 60).toString().padStart(2, "0");
            timerDisplay.textContent = `${mins}:${secs}`;
        }, 1000);
    });

    timerPauseBtn.addEventListener("click", () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerStartBtn.style.opacity = "1";
            timerStartBtn.textContent = "Start";
            addTimelineEvent("Paused Pomodoro study session", new Date().toISOString());
            renderTimeline();
        }
    });
}

// ==========================
// MOCK QUIZ LOGIC
// ==========================
window.startMockQuiz = function() {
    const quizContainer = document.getElementById("quizContainer");
    const quizQuestion = document.getElementById("quizQuestion");
    const savedData = localStorage.getItem("studyBuddyProfile");
    if (!savedData) return;
    
    const user = JSON.parse(savedData);
    quizQuestion.textContent = `Which concept is a core element of ${user.weakSubject} programming?`;
    
    const options = document.querySelectorAll(".quiz-options button");
    options[0].textContent = "Option A: Classes and Inheritance";
    options[1].textContent = "Option B: Direct Memory Management pointers";
    
    quizContainer.style.display = "block";
    document.getElementById("quizFeedback").textContent = "";
};

window.selectAnswer = function(isCorrect) {
    const feedback = document.getElementById("quizFeedback");
    const savedData = localStorage.getItem("studyBuddyProfile");
    const name = savedData ? JSON.parse(savedData).name : "Student";
    
    if (isCorrect) {
        feedback.textContent = "Correct answer! +10 XP logged to Memory Timeline.";
        feedback.style.color = "#22c55e";
        addTimelineEvent(`${name} passed quiz on weak subjects`, new Date().toISOString());
    } else {
        feedback.textContent = "Incorrect answer. Try revising OOP pointers!";
        feedback.style.color = "#ef4444";
        addTimelineEvent(`${name} attempted quiz on weak subjects`, new Date().toISOString());
    }
    
    const user = savedData ? JSON.parse(savedData) : null;
    if (user) {
        updateStatsAndInsights(user);
    }
    renderTimeline();
};