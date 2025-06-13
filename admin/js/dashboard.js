const API_URL = "https://quizmaster-backend-cs3d.onrender.com";


let popularQuizChartInstance = null;
let lowestScoreQuizChartInstance = null;


function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}

function getHeaders() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("No token found, redirecting to login.");
    window.location.href = "index.html";
    return {};
  }
  return { "Authorization": `Bearer ${token}` };
}


async function fetchDashboardData() {
  try {
    const url = `${API_URL}/dashboard-data`;
    

    const response = await fetch(url, { headers: getHeaders() });


    if (response.status === 403) {
        throw new Error("You do not have permission to view this page.");
    }
    if (!response.ok) {
        throw new Error("Failed to fetch dashboard data from the server.");
    }
    
    const data = await response.json();


    renderKpiCards(data.stats);
    renderRecentActivity(data.recent_activity);
    renderPopularQuizzesChart(data.most_attempted_quizzes);
    renderLowestScoringQuizzesChart(data.lowest_scoring_quizzes);

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `<div class="error-message"><h1>Error</h1><p>${error.message}</p><p>Please try logging in again.</p></div>`;
    }
  }
}

function renderKpiCards(stats) {
    const container = document.getElementById('kpi-cards');
    if (!container) return;
    container.innerHTML = `
        <div class="stat-card"><h3>Total Subjects</h3><p>${stats.subjects}</p></div>
        <div class="stat-card"><h3>Total Chapters</h3><p>${stats.chapters}</p></div>
        <div class="stat-card"><h3>Total Quizzes</h3><p>${stats.quizzes}</p></div>
        <div class="stat-card"><h3>Total Questions</h3><p>${stats.questions}</p></div>
        <div class="stat-card"><h3>Active Users</h3><p>${stats.users}</p></div>
    `;
}

function renderRecentActivity(activities) {
    const feed = document.getElementById('recent-activity-feed');
    if (!feed) return;
    if (activities.length === 0) {
        feed.innerHTML = "<p>No recent quiz attempts on the platform.</p>";
        return;
    }
    feed.innerHTML = activities.map(item => `
        <div class="activity-item">
            <div class="activity-details">
                <p class="user-name">${item.user_name}</p>
                <p class="quiz-title">attempted "${item.quiz_title}"</p>
            </div>
            <p class="activity-score">${item.score}</p>
        </div>
    `).join('');
}

function renderPopularQuizzesChart(quizzes) {
    const canvas = document.getElementById('popularQuizChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (popularQuizChartInstance) {
        popularQuizChartInstance.destroy();
    }

    const labels = quizzes.map(q => q.quiz_title);
    const data = quizzes.map(q => q.value);

    popularQuizChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Attempts',
                data: data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });
}

function renderLowestScoringQuizzesChart(quizzes) {
    const canvas = document.getElementById('lowestScoreQuizChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    

    if (lowestScoreQuizChartInstance) {
        lowestScoreQuizChartInstance.destroy();
    }

    const labels = quizzes.map(q => q.quiz_title);
    const data = quizzes.map(q => q.value);

    lowestScoreQuizChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Score',
                data: data,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, suggestedMax: 10 } },
            plugins: { legend: { display: false } }
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("user_role");
    
    if (!token || userRole !== 'admin') {
        window.location.href = "index.html";
        return;
    }
    
    const adminName = localStorage.getItem("user_name");
    const adminNameElement = document.getElementById("admin-name");
    if (adminName && adminNameElement) {
        adminNameElement.textContent = adminName;
    }

    fetchDashboardData();
});