
const API_URL = "https://quizmaster-backend-cs3d.onrender.com";

const subjectContainer = document.getElementById("subject-container");
const chapterQuizSection = document.getElementById("chapter-quiz-section");
const selectedSubjectTitle = document.getElementById("selected-subject-title");
const chapterTabsContainer = document.getElementById("chapter-tabs");
const quizList = document.getElementById("quiz-list");

let allSubjects = [];
let allChapters = [];

function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}

function startQuiz(quizId, quizTitle) {
  const url = `quiz_attempt.html?quiz_id=${quizId}&title=${encodeURIComponent(quizTitle)}`;
  window.location.href = url;
}

async function requestReattempt(userId, quizId, buttonElement) {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/quiz-attempts/request-reattempt`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ user_id: userId, quiz_id: quizId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Failed to send request.");
        alert(result.message);
        buttonElement.textContent = "Request Sent";
        buttonElement.disabled = true;
    } catch(error) {
        console.error("Failed to request re-attempt:", error);
        alert(error.message);
    }
}



async function loadSubjects() {
  try {
    const res = await fetch(`${API_URL}/subjects/`);
    allSubjects = await res.json();
    subjectContainer.innerHTML = ""; 

    if (allSubjects.length === 0) {
      subjectContainer.innerHTML = "<p>No subjects are available at the moment.</p>";
      return;
    }

    allSubjects.forEach(subject => {
      const card = document.createElement("div");
      card.className = "subject-card";
      card.innerHTML = `<h3>${subject.name}</h3><p>${subject.description || 'Start learning this subject'}</p>`;

      card.addEventListener("click", () => handleSubjectClick(subject));
      subjectContainer.appendChild(card);
    });

  } catch (err) {
    console.error("Failed to load subjects", err);
    subjectContainer.innerHTML = "<p>Error loading subjects. Please try again later.</p>";
  }
}

function handleSubjectClick(subject) {
  selectedSubjectTitle.textContent = subject.name; 
  chapterQuizSection.classList.remove("hidden"); 
  loadChapters(subject.id); 
  chapterQuizSection.scrollIntoView({ behavior: 'smooth' });
}


async function loadChapters(subjectId) {
  quizList.innerHTML = ""; 
  chapterTabsContainer.innerHTML = `<div class="loading-spinner small"></div>`;
  try {
    const res = await fetch(`${API_URL}/chapters/by-subject/${subjectId}`);
    const chapters = await res.json();
    chapterTabsContainer.innerHTML = ""; 

    if (chapters.length === 0) {
      chapterTabsContainer.innerHTML = "<p>No chapters available for this subject.</p>";
      return;
    }
    
    chapters.forEach((chapter, index) => {
      const tab = document.createElement("button");
      tab.className = "chapter-tab";
      tab.textContent = chapter.name;
      tab.dataset.chapterId = chapter.id;


      tab.addEventListener("click", (e) => {

        document.querySelectorAll('.chapter-tab.active').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');

        loadQuizzes(chapter.id);
      });

      chapterTabsContainer.appendChild(tab);

      if (index === 0) {
        tab.click();
      }
    });
  } catch (err) {
    console.error("Failed to load chapters", err);
  }
}


async function loadQuizzes(chapterId) {
  quizList.innerHTML = `<li>Loading quizzes...</li>`;
  try {
    const res = await fetch(`${API_URL}/quizzes/by-chapter/${chapterId}`);
    if (!res.ok) throw new Error('Failed to fetch quizzes.');
    const quizzes = await res.json();
    quizList.innerHTML = "";

    if (quizzes.length === 0) {
      quizList.innerHTML = "<li>No quizzes available for this chapter.</li>";
      return;
    }

    const userId = localStorage.getItem("user_id");

    for (const quiz of quizzes) {
        const attemptCountRes = await fetch(`${API_URL}/quiz-attempts/by-user-quiz/${userId}/${quiz.id}`);
        const attempts = attemptCountRes.ok ? await attemptCountRes.json() : [];
        const attemptCount = attempts.length;
        
        const badge = quiz.is_ai_generated ? '<span ></span>' : '';
        
        let buttonHtml;
        if (attemptCount >= 3) {
            buttonHtml = `<button class="btn btn-secondary" onclick="requestReattempt(${userId}, ${quiz.id}, this)">Request Re-attempt</button>`;
        } else {
            buttonHtml = `<button class="btn" onclick="startQuiz(${quiz.id}, '${quiz.title}')">Start Quiz (${attemptCount}/3)</button>`;
        }
        
        const listItem = document.createElement("li");
        listItem.innerHTML = `<div>${quiz.title} ${badge}</div><div class="quiz-actions">${buttonHtml}</div>`;
        quizList.appendChild(listItem);
    }

  } catch (err) {
    console.error("Failed to load quizzes", err);
    quizList.innerHTML = "<li>Error loading quizzes.</li>";
  }
}


window.onload = () => {
  const userName = localStorage.getItem("user_name");
  if (userName) document.getElementById("user-name").textContent = userName;
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../index.html';
    return;
  }
  loadSubjects();
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebar = document.querySelector('.sidebar');

  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      hamburgerBtn.classList.toggle('open');
    });
  }
};
