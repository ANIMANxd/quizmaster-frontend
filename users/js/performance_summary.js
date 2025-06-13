const API_URL = "https://quizmaster-backend-cs3d.onrender.com";


let subjectChartInstance = null;
let trendChartInstance = null;

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  window.location.href = "../index.html";
}

async function loadPerformanceData() {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        document.querySelector('.content-wrapper').innerHTML = "<h1>Error</h1><p>Could not find user ID. Please log in again.</p>";
        return;
    }

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/performance/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Could not load performance data.");
        
        const data = await response.json();

        if (data.total_attempts === 0) {
            document.querySelector('.content-wrapper').innerHTML += "<h1>No Data Yet</h1><p>You haven't attempted any quizzes. Complete a quiz to see your performance here!</p>";
            return;
        }

        renderSummaryCards(data);
        renderSubjectChart(data.performance_by_subject);
        renderTrendChart(data.recent_attempts);
        renderPerformanceList(document.getElementById('best-quizzes-list'), data.best_performing_quizzes, 'best_score');
        renderPerformanceList(document.getElementById('improvement-areas-list'), data.improvement_areas, 'best_score');

    } catch (error) {
        console.error("Failed to load performance data:", error);
        document.querySelector('.charts-grid').innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderSummaryCards(data) {
    const container = document.getElementById('stats-grid');
    container.innerHTML = `
        <div class="stat-card"><h3>Total Quizzes Taken</h3><p>${data.total_quizzes_taken}</p></div>
        <div class="stat-card"><h3>Total Attempts</h3><p>${data.total_attempts}</p></div>
        <div class="stat-card"><h3>Overall Average Score</h3><p>${data.average_score.toFixed(1)}</p></div>
        <div class="stat-card"><h3>Best Subject</h3><p>${data.best_subject || 'N/A'}</p></div>
    `;
}

function renderSubjectChart(subjectData) {
    const ctx = document.getElementById('subjectChart').getContext('2d');
    
    if (subjectChartInstance) {
        subjectChartInstance.destroy();
    }

    const labels = subjectData.map(item => item.subject_name);
    const scores = subjectData.map(item => item.average_score);

    subjectChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Score',
                data: scores,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false }, title: { display: true, text: 'Average Score per Subject' } }
        }
    });
}

function renderTrendChart(trendData) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    const labels = trendData.map((item, index) => `Attempt ${index + 1}`);
    const scores = trendData.map(item => item.score);

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score',
                data: scores,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false }, title: { display: true, text: 'Last 10 Quiz Attempts' } }
        }
    });
}

function renderPerformanceList(container, items, scoreField) {
    if (!items || items.length === 0) {
        container.innerHTML = "<p>Not enough data to display.</p>";
        return;
    }

    container.innerHTML = items.map(item => {
        const score = item[scoreField];
        let badgeClass = 'medium';
        if (score >= 8) badgeClass = 'high';
        if (score < 5) badgeClass = 'low';

        return `
            <div class="performance-list-item">
                <span class="quiz-title">${item.quiz_title}</span>
                <span class="score-badge ${badgeClass}">${score}</span>
            </div>
        `;
    }).join('');
}


window.onload = () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = '../index.html';
        return;
    }
    loadPerformanceData();
};