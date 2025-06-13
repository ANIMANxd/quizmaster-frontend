

const API_URL = "http://127.0.0.1:8000";
const quizId = new URLSearchParams(window.location.search).get("quiz_id");
const quizTitle = new URLSearchParams(window.location.search).get("title");


const quizTitleHeading = document.getElementById("quiz-title");
const questionsContainer = document.getElementById("questions-container");
const quizForm = document.getElementById("quiz-form");
const resultBox = document.getElementById("result");
const reattemptBtn = document.getElementById("reattempt-btn");
const attemptsDiv = document.getElementById("attempt-history");

quizTitleHeading.textContent = decodeURIComponent(quizTitle);
let quizData = {}; 



async function loadQuizQuestions() {
  try {
    console.log(`Loading questions for quiz ID: ${quizId}`);
    

    const response = await fetch(`${API_URL}/quizzes/${quizId}/questions`);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch quiz questions: ${response.status}`);
    }
      
    quizData = await response.json();
    const questions = quizData.questions;
    console.log("Quiz data loaded:", quizData);
    
    if (!questions || questions.length === 0) {
      questionsContainer.innerHTML = "<p>No questions available for this quiz.</p>";
      return;
    }

    questionsContainer.innerHTML = ""; 

    questions.forEach((q, index) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("question-block");
      
      wrapper.innerHTML = `
        <p><strong>Q${index + 1}:</strong> ${q.question} (${q.marks} marks)</p>
        ${q.options.map((option_text, i) => {
          const inputType = q.type.toUpperCase() === "MSQ" ? "checkbox" : "radio";
          const name = `q_${q.id}`;
          const id = `q${q.id}_opt${i}`;
          return `
            <div class="option">
              <input type="${inputType}" name="${name}" id="${id}" value="${option_text}" />
              <label for="${id}">${option_text}</label>
            </div>
          `;
        }).join("")}
        <hr/>
      `;
      questionsContainer.appendChild(wrapper);
    });
    
  } catch (err) {
    console.error("Failed to load questions:", err);
    questionsContainer.innerHTML = `<p style="color:red;">Error loading questions: ${err.message}</p>`;
  }
}

quizForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const questions = quizData.questions;
  if (!questions || questions.length === 0) {
    alert("No questions to evaluate.");
    return;
  }

  let score = 0;
  let total = 0;

  for (const q of questions) {
    total += q.marks;
    
    const selectedAnswers = Array.from(document.querySelectorAll(`input[name="q_${q.id}"]:checked`))
                                 .map(input => input.value); 
    
    const correctAnswers = q.correct_answers;

    const isCorrect = selectedAnswers.length === correctAnswers.length &&
                      [...selectedAnswers].sort().join(',') === [...correctAnswers].sort().join(',');
                      
    if (isCorrect) {
      score += q.marks;
    }
  }

  resultBox.textContent = `✅ You scored ${score} out of ${total}`;
  await submitQuizAttempt(score, quizId);
});

async function submitQuizAttempt(score, qId) {
  const userId = localStorage.getItem("user_id");
  if (!userId) return alert("User not logged in.");

  const payload = {
    user_id: parseInt(userId),
    quiz_id: parseInt(qId),
    score: parseInt(score)
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/quiz-attempts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.status === 403) {
      const data = await res.json();
      alert(data.detail || "You've reached the maximum 3 attempts for this quiz.");
      return;
    }

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to submit quiz attempt.");
    }

    const data = await res.json();
    showNotification(`Submitted! Score: ${data.score}, Attempt: ${data.attempt_number}`, true);
    setTimeout(() => window.location.href = "user_dashboard.html", 2000);
    
  } catch (err) {
    console.error("Error submitting quiz:", err);
    showNotification(`Error: ${err.message}`, false);
  }
}

async function loadPreviousAttempts(userId, qId) {
  if (!userId || !qId) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/quiz-attempts/by-user-quiz/${userId}/${qId}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) {
        attemptsDiv.innerHTML = "<p>No previous attempts yet.</p>";
        reattemptBtn.classList.remove("hidden");
        return;
    }
    const attempts = await res.json();
    if (attempts.length > 0) {
        attemptsDiv.innerHTML = "<h4>Your Previous Attempts:</h4>" + attempts.map(a =>
            `<p>Attempt ${a.attempt_number}: <strong>${a.score} points</strong> - ${new Date(a.timestamp).toLocaleString()}</p>`
        ).join("");
    }
    
    if (attempts.length < 3) {
        reattemptBtn.classList.remove("hidden");
    } else {
        reattemptBtn.classList.add("hidden");
        document.querySelector('button[type="submit"]').disabled = true;
        showNotification("You have reached the maximum number of attempts for this quiz.", false);
    }
  } catch (err) {
    console.error("Error loading attempts:", err);
  }
}

reattemptBtn.addEventListener("click", () => {
  questionsContainer.innerHTML = "";
  resultBox.textContent = "";
  loadQuizQuestions();
});

window.onload = async () => {
  const userId = localStorage.getItem("user_id");
  if (!quizId) {
    questionsContainer.innerHTML = "<p>Error: No quiz ID specified.</p>";
    return;
  }
  
  await loadQuizQuestions();
  await loadPreviousAttempts(userId, quizId);
};

function showNotification(message, isSuccess = true) {
  const notification = document.createElement('div');
  notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}