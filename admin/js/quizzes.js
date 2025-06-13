
const API_BASE = "https://quizmaster-backend-cs3d.onrender.com";

const quizTableBody = document.getElementById("quiz-table-body");
const addQuizModal = document.getElementById("addQuizModal");
const createQuizForm = document.getElementById("createQuizForm");
const quizTitleInput = document.getElementById("quizTitle");
const quizSubjectSelect = document.getElementById("quizSubject");
const quizChapterSelect = document.getElementById("quizChapter");
const questionModal = document.getElementById("questionModal");
const questionForm = document.getElementById("questionForm");
const questionText = document.getElementById("questionText");
const questionType = document.getElementById("questionType");
const questionMarks = document.getElementById("questionMarks");
const optionsContainer = document.getElementById("optionsContainer");
const addOptionBtn = document.getElementById("addOptionBtn");
const addQuestionToBufferBtn = document.getElementById("addQuestionToBuffer");
const submitQuizQuestionsBtn = document.getElementById("submitQuizQuestions");
const manualQuestionPreviewList = document.getElementById("questionPreviewList");
const undoLastQuestionBtn = document.getElementById("undoLastQuestion");

const aiModal = document.getElementById("aiModal");
const openAIModalBtn = document.getElementById("openAIModalBtn");
const createAIQuizForm = document.getElementById("createAIQuizForm");
const subjectSelect = document.getElementById("subjectSelect");
const chapterSelect = document.getElementById("chapterSelect");
const generateQuizBtn = document.getElementById("generateQuizBtn");
const questionsPreviewModal = document.getElementById("questionsPreviewModal");
const aiQuestionsPreviewList = document.getElementById("questionsPreviewList");
const previewTitle = document.getElementById("previewTitle");
const submitAIQuizBtn = document.getElementById("submitAIQuizBtn");

let subjects = [];
let chapters = [];
let quizQuestionsBuffer = []; 
let currentQuizId = null;
let editingQuizId = null;
let generatedQuestionsData = {}; 

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  window.location.href = "../index.html";
}

function showNotification(message, isSuccess = true) {
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

async function loadSubjects() {
  const res = await fetch(`${API_BASE}/subjects/`);
  subjects = await res.json();
  const subjectOptions = subjects.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join("");
  quizSubjectSelect.innerHTML = subjectOptions;
  subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' + subjectOptions;
}

async function loadChapters(subjectId, targetDropdown) {
  const res = await fetch(`${API_BASE}/chapters/`);
  chapters = await res.json();
  const filteredChapters = chapters.filter(c => c.subject_id == subjectId);
  const chapterOptions = filteredChapters.map(chap => `<option value="${chap.id}">${chap.name}</option>`).join("");
  targetDropdown.innerHTML = chapterOptions;
}

async function loadAllQuizzes() {
  const res = await fetch(`${API_BASE}/quizzes/`);
  const quizzes = await res.json();
  quizTableBody.innerHTML = "";

  if (!chapters.length) {
    const chapRes = await fetch(`${API_BASE}/chapters/`); 
    chapters = await chapRes.json();
    console.log("All Chapters Loaded:", chapters); 
  }

  console.log("All Quizzes from API:", quizzes);

  quizzes.forEach(quiz => {
    console.log(`Processing Quiz: '${quiz.title}' with Chapter ID: ${quiz.chapter_id}`);
    const chapter = chapters.find(c => c.id == quiz.chapter_id);
    if (!chapter) {
        console.warn(`--> FAILED to find a match for Chapter ID: ${quiz.chapter_id}`);
    } else {
        console.log(`--> SUCCESS: Found chapter:`, chapter);
    }
    
    const subject = chapter ? subjects.find(s => s.id == chapter.subject_id) : null;
    
    const row = document.createElement("tr");

    let actionButtons = `
        <button class="btn btn-warning btn-edit" data-quiz-id="${quiz.id}">Edit</button>
        <button class="btn btn-danger btn-delete" data-quiz-id="${quiz.id}">Delete</button>
    `;
    actionButtons = `<button class="btn btn-secondary btn-add-questions" data-quiz-id="${quiz.id}">Add Questions</button>` + actionButtons;
    


    row.innerHTML = `
      <td>${quiz.title}</td>
      <td><span class="badge ${quiz.is_ai_generated ? 'badge-ai' : 'badge-manual'}">${quiz.is_ai_generated ? 'AI' : 'Manual'}</span></td>
      <td>${subject ? subject.name : "N/A"}</td>
      <td>${chapter ? chapter.name : "N/A"}</td>
      <td class="actions">${actionButtons}</td>
    `;
    quizTableBody.appendChild(row);

    row.innerHTML = `
      <td>${quiz.title}</td>
      <td><span class="badge ${quiz.is_ai_generated ? 'badge-ai' : 'badge-manual'}">${quiz.is_ai_generated ? 'AI' : 'Manual'}</span></td>
      <td>${subject ? subject.name : "N/A"}</td>
      <td>${chapter ? chapter.name : "N/A"}</td>
      <td class="actions">${actionButtons}</td>
    `;
    quizTableBody.appendChild(row);
  });
}

quizTableBody.addEventListener('click', (event) => {
    const target = event.target.closest('button'); 
    if (!target) return;

    const quizId = target.dataset.quizId;
    if (!quizId) return;

    if (target.classList.contains('btn-add-questions')) {
        openQuestionModal(quizId);
    } else if (target.classList.contains('btn-edit')) {
        editQuiz(quizId);
    } else if (target.classList.contains('btn-delete')) {
        deleteQuiz(quizId);
    }
});


function openAddQuizModal() { addQuizModal.classList.remove("hidden"); }
function closeAddQuizModal() {
  addQuizModal.classList.add("hidden");
  editingQuizId = null;
  createQuizForm.reset();
}
function openAIModal() { aiModal.classList.remove("hidden"); }
function closeAIModal() { aiModal.classList.add("hidden"); }
function openQuestionModal(quizId) {
    currentQuizId = quizId;
    quizQuestionsBuffer = [];
    manualQuestionPreviewList.innerHTML = '';
    questionForm.reset();
    optionsContainer.innerHTML = "";
    createOptionInput(); 
    createOptionInput(); 
    questionModal.classList.remove("hidden");
}
function closeQuestionModal() { questionModal.classList.add("hidden"); }
function closeQuestionsPreviewModal() {
    questionsPreviewModal.classList.add("hidden");
    generatedQuestionsData = {};
}


document.getElementById("openAddQuizModal").addEventListener("click", openAddQuizModal);
openAIModalBtn.addEventListener("click", openAIModal);
quizSubjectSelect.addEventListener("change", (e) => loadChapters(e.target.value, quizChapterSelect));
subjectSelect.addEventListener("change", (e) => loadChapters(e.target.value, chapterSelect));


createQuizForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const quizData = { title: quizTitleInput.value, chapter_id: quizChapterSelect.value };
    const url = editingQuizId ? `${API_BASE}/quizzes/${editingQuizId}` : `${API_BASE}/quizzes/`;
    const method = editingQuizId ? "PUT" : "POST";
    
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(quizData) });
    if (res.ok) {
        closeAddQuizModal();
        await loadAllQuizzes();
        showNotification("Manual quiz saved!", true);
    } else { showNotification("Error saving quiz.", false); }
});

async function editQuiz(quizId) {
    const res = await fetch(`${API_BASE}/quizzes/${quizId}`);
    if (!res.ok) return showNotification("Quiz not found.", false);
    const quiz = await res.json();
    editingQuizId = quiz.id;
    quizTitleInput.value = quiz.title;
    const chapter = chapters.find(c => c.id == quiz.chapter_id);
    if (chapter) {
        quizSubjectSelect.value = chapter.subject_id;
        await loadChapters(chapter.subject_id, quizChapterSelect);
        quizChapterSelect.value = quiz.chapter_id;
    }
    openAddQuizModal();
}

async function deleteQuiz(quizId) {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    const res = await fetch(`${API_BASE}/quizzes/${quizId}`, { method: "DELETE" });
    if (res.ok) {
        await loadAllQuizzes();
        showNotification("Quiz deleted.", true);
    } else { showNotification("Error deleting quiz.", false); }
}


addOptionBtn.addEventListener("click", () => {
    if (optionsContainer.children.length < 6) createOptionInput();
    else alert("Max 6 options");
});

function createOptionInput() {
    const div = document.createElement("div");
    div.classList.add("option-entry");
    div.innerHTML = `
        <input type="text" placeholder="Option text" class="option-text" required>
        <input type="checkbox" class="option-correct">
        <label>Correct</label>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    optionsContainer.appendChild(div);
}

addQuestionToBufferBtn.addEventListener("click", () => {
    if (optionsContainer.children.length < 2) return alert("At least 2 options needed");
    const options = Array.from(optionsContainer.children).map(optDiv => ({
        option_text: optDiv.querySelector(".option-text").value,
        is_correct: optDiv.querySelector(".option-correct").checked
    }));
    const question = {
        quiz_id: currentQuizId,
        question_text: questionText.value,
        marks: parseInt(questionMarks.value),
        question_type: questionType.value,
        options
    };
    quizQuestionsBuffer.push(question);
    renderAllManualQuestions();
    questionForm.reset();
    optionsContainer.innerHTML = "";
    createOptionInput();
    createOptionInput();
});

submitQuizQuestionsBtn.addEventListener("click", async () => {
    if (quizQuestionsBuffer.length === 0) return alert("Add at least one question.");
    for (const q of quizQuestionsBuffer) {
        await fetch(`${API_BASE}/questions/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(q)
        });
    }
    showNotification("Questions added successfully!", true);
    closeQuestionModal();
    quizQuestionsBuffer = [];
});

function renderAllManualQuestions() {
    manualQuestionPreviewList.innerHTML = "";
    quizQuestionsBuffer.forEach((q, i) => renderManualQuestionPreview(q, i));
}

function renderManualQuestionPreview(question, index) {
    const div = document.createElement("div");
    div.classList.add("submitted-question");
    div.innerHTML = `
        <strong>${question.question_text}</strong> (${question.question_type.toUpperCase()}, ${question.marks} marks)
        <ul>${question.options.map(opt => `<li>${opt.option_text} ${opt.is_correct ? "" : ""}</li>`).join("")}</ul>
        <button class="btn btn-danger btn-sm" onclick="deleteManualQuestion(${index})"> Delete</button><hr />
    `;
    manualQuestionPreviewList.appendChild(div);
}

function deleteManualQuestion(index) {
    quizQuestionsBuffer.splice(index, 1);
    renderAllManualQuestions();
}

undoLastQuestionBtn.addEventListener("click", () => {
    if (quizQuestionsBuffer.length === 0) return alert("No questions to undo.");
    quizQuestionsBuffer.pop();
    renderAllManualQuestions();
});


createAIQuizForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    generateQuizBtn.disabled = true;
    generateQuizBtn.textContent = "Generating...";
    const formData = new FormData();
    formData.append("file", document.getElementById('fileUpload').files[0]);
    formData.append("mcq_count", document.getElementById('numMCQs').value);
    formData.append("msq_count", document.getElementById('numMSQs').value);
    formData.append("marks_per_question", document.getElementById('marksPerQuestion').value);

    try {
        const response = await fetch(`${API_BASE}/ai-quizzes/generate`, { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to generate quiz.');
        generatedQuestionsData = { title: data.title, questions: data.questions, chapter_id: parseInt(chapterSelect.value) };
        closeAIModal();
        displayQuestionsPreview();
        questionsPreviewModal.classList.remove("hidden");
    } catch (error) {
        showNotification(error.message, false);
    } finally {
        generateQuizBtn.disabled = false;
        generateQuizBtn.textContent = "Generate Quiz";
    }
});

submitAIQuizBtn.addEventListener("click", async () => {
    submitAIQuizBtn.disabled = true;
    submitAIQuizBtn.textContent = "Submitting...";
    generatedQuestionsData.title = document.getElementById('editableTitle').value;
    try {
        const response = await fetch(`${API_BASE}/ai-quizzes/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(generatedQuestionsData) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to save AI quiz.');
        showNotification("AI Quiz saved successfully!", true);
        closeQuestionsPreviewModal();
        await loadAllQuizzes();
    } catch (error) {
        showNotification(error.message, false);
    } finally {
        submitAIQuizBtn.disabled = false;
        submitAIQuizBtn.textContent = "Save Quiz to Database";
    }
});


function displayQuestionsPreview(readOnly = false) {
    aiQuestionsPreviewList.innerHTML = "";
    const questions = generatedQuestionsData.questions;
    if (!questions || questions.length === 0) {
        aiQuestionsPreviewList.innerHTML = '<p>No questions to display.</p>';
        return;
    }
    previewTitle.innerHTML = `<input type="text" id="editableTitle" value="${generatedQuestionsData.title}" class="modal-title-input">`;
    questions.forEach((question, index) => {
        const questionDiv = document.createElement("div");
        questionDiv.className = "question-preview-item";
        questionDiv.innerHTML = createEditableQuestionHTML(index, question, readOnly);
        aiQuestionsPreviewList.appendChild(questionDiv);
    });
    if (!readOnly) {
        const addQuestionDiv = document.createElement("div");
        addQuestionDiv.style.textAlign = 'center';
        addQuestionDiv.innerHTML = `<button class="btn btn-success" onclick="addNewQuestion()">+ Add New Question</button>`;
        aiQuestionsPreviewList.appendChild(addQuestionDiv);
    }
}
function createEditableQuestionHTML(index, q, readOnly) {
    const optionsHtml = q.options.map((option, optIndex) => {
        const isCorrect = q.correct_answers.includes(option);
        return `<div class="editable-option"><input type="checkbox" ${isCorrect ? 'checked' : ''} ${readOnly ? 'disabled' : ''} onchange="toggleCorrectAnswer(${index}, ${optIndex})"><input type="text" value="${option}" ${readOnly ? 'readonly' : ''} onchange="updateOptionText(${index}, ${optIndex}, this.value)" class="editable-option-text">${!readOnly ? `<button class="btn-remove-option" onclick="deleteOption(${index}, ${optIndex})">×</button>` : ''}</div>`;
    }).join("");
    return `<div class="editable-question-header"><strong class="editable-question-number">Q${index + 1}:</strong><textarea ${readOnly ? 'readonly' : ''} onchange="updateQuestionText(${index}, this.value)" class="editable-question-textarea">${q.question}</textarea></div><div class="editable-question-body"><div class="editable-question-options"><label>Options:</label>${optionsHtml}${!readOnly ? `<button class="btn btn-info btn-sm" onclick="addOption(${index})">+ Add Option</button>` : ''}</div><div class="editable-question-meta"><div><label>Type:</label><select ${readOnly ? 'disabled' : ''} onchange="updateQuestionType(${index}, this.value)"><option value="MCQ" ${q.type.toUpperCase() === 'MCQ' ? 'selected' : ''}>MCQ</option><option value="MSQ" ${q.type.toUpperCase() === 'MSQ' ? 'selected' : ''}>MSQ</option></select></div><div><label>Marks:</label><input type="number" value="${q.marks}" min="1" ${readOnly ? 'readonly' : ''} onchange="updateQuestionMarks(${index}, this.value)"></div>${!readOnly ? `<button class="btn btn-danger" onclick="deleteQuestion(${index})">Delete Question</button>` : ''}</div></div>`;
}
function updateQuestionText(index, newText) { generatedQuestionsData.questions[index].question = newText; }
function updateQuestionType(index, newType) {
    const question = generatedQuestionsData.questions[index];
    question.type = newType;
    if (newType === 'MCQ' && question.correct_answers.length > 1) {
        question.correct_answers = [question.correct_answers[0]];
    }
    displayQuestionsPreview();
}
function updateQuestionMarks(index, newMarks) { generatedQuestionsData.questions[index].marks = parseInt(newMarks) || 1; }
function updateOptionText(index, optIndex, newText) {
    const question = generatedQuestionsData.questions[index];
    const oldText = question.options[optIndex];
    question.options[optIndex] = newText;
    const correctIndex = question.correct_answers.indexOf(oldText);
    if (correctIndex > -1) question.correct_answers[correctIndex] = newText;
}
function toggleCorrectAnswer(index, optIndex) {
    const question = generatedQuestionsData.questions[index];
    const option = question.options[optIndex];
    const correctIndex = question.correct_answers.indexOf(option);
    if (correctIndex > -1) { question.correct_answers.splice(correctIndex, 1); } 
    else {
        if (question.type.toUpperCase() === 'MCQ') { question.correct_answers = [option]; } 
        else { question.correct_answers.push(option); }
    }
    displayQuestionsPreview();
}
function addOption(index) {
    generatedQuestionsData.questions[index].options.push("New Option");
    displayQuestionsPreview();
}
function deleteOption(index, optIndex) {
    const question = generatedQuestionsData.questions[index];
    if (question.options.length <= 2) return showNotification("A question must have at least 2 options.", false);
    const optionToDelete = question.options[optIndex];
    question.options.splice(optIndex, 1);
    const correctIndex = question.correct_answers.indexOf(optionToDelete);
    if (correctIndex > -1) question.correct_answers.splice(correctIndex, 1);
    displayQuestionsPreview();
}
function deleteQuestion(index) {
    if (generatedQuestionsData.questions.length <= 1) return showNotification("A quiz must have at least one question.", false);
    generatedQuestionsData.questions.splice(index, 1);
    displayQuestionsPreview();
}
function addNewQuestion() {
    generatedQuestionsData.questions.push({ question: "New Question Text", type: "MCQ", marks: 1, options: ["Option A", "Option B"], correct_answers: ["Option A"] });
    displayQuestionsPreview();
}

window.onload = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "../index.html";
        return;
    }
    await loadSubjects();
    await loadAllQuizzes();
};