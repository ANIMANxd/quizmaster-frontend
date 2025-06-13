const API_URL = "https://quizmaster-backend-cs3d.onrender.com";

const attemptsContainer = document.getElementById("attempts-container");

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_name");
  window.location.href = "../index.html";
}

async function loadAttemptHistory() {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    attemptsContainer.innerHTML = "<p>Could not find user ID. Please log in again.</p>";
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/quiz-attempts/by-user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch your quiz history.");
    }

    const attempts = await response.json();

    if (attempts.length === 0) {
      attemptsContainer.innerHTML = "<p>You have not attempted any quizzes yet.</p>";
      return;
    }

    const attemptsByQuiz = attempts.reduce((acc, attempt) => {
      const title = attempt.quiz.title;
      if (!acc[title]) {
        acc[title] = [];
      }
      acc[title].push(attempt);
      return acc;
    }, {});

    attemptsContainer.innerHTML = "";

    for (const quizTitle in attemptsByQuiz) {
      const quizAttempts = attemptsByQuiz[quizTitle];
      const quizId = quizAttempts[0].quiz_id; 

      const quizCard = document.createElement("div");
      quizCard.className = "history-card";

      let attemptsHtml = quizAttempts.map(attempt => `
        <div class="history-attempt-row">
          <span>Attempt #${attempt.attempt_number}</span>
          <span>Score: <strong>${attempt.score}</strong></span>
          <span class="timestamp">${new Date(attempt.timestamp).toLocaleString()}</span>
        </div>
      `).join('');


      let reattemptButtonHtml = '';
      if (quizAttempts.length >= 3) {
        reattemptButtonHtml = `
          <div class="reattempt-request">
            <p>You have reached the maximum number of attempts.</p>
            <button class="btn btn-secondary" onclick="requestReattempt(${userId}, ${quizId})">
              Request Re-attempt from Admin
            </button>
          </div>
        `;
      }

      quizCard.innerHTML = `
        <h3>${quizTitle}</h3>
        <div class="history-attempts-list">
          ${attemptsHtml}
        </div>
        ${reattemptButtonHtml}
      `;

      attemptsContainer.appendChild(quizCard);
    }

  } catch (error) {
    console.error("Error loading history:", error);
    attemptsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
  }
}

async function requestReattempt(userId, quizId) {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/quiz-attempts/request-reattempt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId, quiz_id: quizId })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || "Failed to send request.");
        }

        alert(result.message);
        event.target.disabled = true;
        event.target.textContent = 'Request Sent';

    } catch(error) {
        console.error("Failed to request re-attempt:", error);
        alert(error.message);
    }
}


window.onload = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = '../index.html';
    return;
  }
  loadAttemptHistory();
};