const API_URL = "http://localhost:8000";
let allUsers = []; 


let subjectChartInstance = null;
let trendChartInstance = null;


function getHeaders() {
  const token = localStorage.getItem("token");
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}



async function fetchUsers() {
  try {
    const res = await fetch(`${API_URL}/users/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch users. You may not be an admin.");
    allUsers = await res.json();
    applyFilters(); 
  } catch (err) {
    alert("Error fetching users: " + err.message);
  }
}

function applyFilters() {
    const searchKeyword = document.getElementById("searchInput").value.trim().toLowerCase();
    const roleFilter = document.getElementById("roleFilter").value;

    let filteredUsers = allUsers;

    if (roleFilter !== "all") {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }

    if (searchKeyword) {
        filteredUsers = filteredUsers.filter(user =>
            user.name.toLowerCase().includes(searchKeyword) ||
            user.email.toLowerCase().includes(searchKeyword)
        );
    }

    renderUsers(filteredUsers);
}

function renderUsers(users) {
  const tbody = document.getElementById("user-table-body");
  tbody.innerHTML = "";
  if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No users match the current filters.</td></tr>';
      return;
  }
  users.forEach(user => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="badge badge-${user.role}">${user.role}</span></td>
      <td class="actions">
        <button class="btn btn-info" onclick="openPerformanceModal(${user.id}, '${user.name}')">Performance</button>
        <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
        const res = await fetch(`${API_URL}/users/${id}`, { method: "DELETE", headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to delete user");
        alert("User deleted successfully!");
        fetchUsers(); 
    } catch (err) {
        alert("Error deleting user: " + err.message);
    }
}

async function addUser(event) {
    event.preventDefault();
    const name = document.getElementById("addUserName").value.trim();
    const email = document.getElementById("addUserEmail").value.trim();
    const password = document.getElementById("addUserPassword").value.trim();
    const role = document.getElementById("addUserRole").value;

    if (!name || !email || !password || !role) return alert("All fields are required.");

    try {
        const res = await fetch(`${API_URL}/users/addUser`, { 
            method: "POST", headers: getHeaders(), body: JSON.stringify({ name, email, password, role })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Failed to add user.");
        }
        alert("User added successfully!");
        closeAddUserModal();
        fetchUsers(); 
    } catch (err) {
        alert("Add user failed: " + err.message);
    }
}


function openAddUserModal() { document.getElementById('addUserModal').classList.remove('hidden'); }
function closeAddUserModal() {
    document.getElementById('addUserForm').reset();
    document.getElementById('addUserModal').classList.add('hidden');
}

function openPerformanceModal(userId, userName) {
    const modal = document.getElementById('performanceModal');
    const title = document.getElementById('performance-modal-title');
    const body = document.getElementById('performance-modal-body');
    
    title.textContent = `Performance for ${userName}`;
    body.innerHTML = '<div class="loading-spinner"></div>'; 
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    loadAndRenderPerformance(userId, body);
}

function closePerformanceModal() {
    document.getElementById('performanceModal').classList.add('hidden');
    document.body.style.overflow = 'auto';

    if (subjectChartInstance) subjectChartInstance.destroy();
    if (trendChartInstance) trendChartInstance.destroy();
}


async function loadAndRenderPerformance(userId, modalBody) {
    try {
        const res = await fetch(`${API_URL}/performance/user/${userId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Could not load performance data for this user.');
        const data = await res.json();

        modalBody.innerHTML = `
            <div class="stats-grid" id="stats-grid-admin"></div>
            <div class="charts-grid" id="charts-grid-admin">
                <div class="chart-container"><h3>Average Score by Subject</h3><div class="chart-wrapper"><canvas id="subjectChartAdmin"></canvas></div></div>
                <div class="chart-container"><h3>Recent Performance Trend</h3><div class="chart-wrapper"><canvas id="trendChartAdmin"></canvas></div></div>
                <div class="chart-container"><h3>Best Performing Quizzes</h3><div id="best-quizzes-list-admin" class="performance-list"></div></div>
                <div class="chart-container"><h3>Areas for Improvement</h3><div id="improvement-areas-list-admin" class="performance-list"></div></div>
            </div>
        `;

        if (data.total_attempts === 0) {
            modalBody.querySelector('#stats-grid-admin').style.display = 'none';
            modalBody.querySelector('#charts-grid-admin').innerHTML = '<h2 style="text-align:center; padding: 40px;">No Data Yet</h2><p style="text-align:center;">This user has not attempted any quizzes.</p>';
            return;
        }

        renderSummaryCards(data);
        renderSubjectChart(data.performance_by_subject);
        renderTrendChart(data.recent_attempts);
        renderPerformanceList(document.getElementById('best-quizzes-list-admin'), data.best_performing_quizzes);
        renderPerformanceList(document.getElementById('improvement-areas-list-admin'), data.improvement_areas);

    } catch (error) {
        modalBody.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

function renderSummaryCards(data) {
    const container = document.getElementById('stats-grid-admin');
    container.innerHTML = `
        <div class="stat-card"><h3>Total Quizzes Taken</h3><p>${data.total_quizzes_taken}</p></div>
        <div class="stat-card"><h3>Total Attempts</h3><p>${data.total_attempts}</p></div>
        <div class="stat-card"><h3>Overall Average</h3><p>${data.average_score.toFixed(1)}</p></div>
        <div class="stat-card"><h3>Best Subject</h3><p>${data.best_subject || 'N/A'}</p></div>
    `;
}

function renderPerformanceList(container, items) {
    if (!items || items.length === 0) {
        container.innerHTML = "<p>Not enough data to display.</p>";
        return;
    }
    container.innerHTML = items.map(item => {
        const score = item.best_score;
        let badgeClass = score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
        return `<div class="performance-list-item"><span class="quiz-title">${item.quiz_title}</span><span class="score-badge ${badgeClass}">${score}</span></div>`;
    }).join('');
}

function renderSubjectChart(subjectData) {
    const ctx = document.getElementById('subjectChartAdmin').getContext('2d');
    subjectChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjectData.map(item => item.subject_name),
            datasets: [{
                label: 'Average Score',
                data: subjectData.map(item => item.average_score),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, suggestedMax: 10 } }, plugins: { legend: { display: false } } }
    });
}

function renderTrendChart(trendData) {
    const ctx = document.getElementById('trendChartAdmin').getContext('2d');
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map((item, i) => `Attempt ${i + 1}`),
            datasets: [{
                label: 'Score',
                data: trendData.map(item => item.score),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, suggestedMax: 10 } }, plugins: { legend: { display: false } } }
    });
}


document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token || localStorage.getItem("user_role") !== 'admin') {
        window.location.href = "../index.html";
        return;
    }

    fetchUsers();

    const searchInput = document.getElementById("searchInput");
    const roleFilter = document.getElementById("roleFilter");

    searchInput.addEventListener("keyup", applyFilters);
    roleFilter.addEventListener("change", applyFilters);

    document.getElementById('openAddUserModal').addEventListener('click', openAddUserModal);
    document.getElementById('addUserForm').addEventListener('submit', addUser);
});