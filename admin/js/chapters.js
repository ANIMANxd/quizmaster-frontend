const chapterTableBody = document.getElementById("chapter-table-body");
const chapterModal = document.getElementById("chapterModal");
const chapterForm = document.getElementById("chapterForm");
const chapterIdInput = document.getElementById("chapterId");
const chapterNameInput = document.getElementById("chapterName");
const chapterSubjectSelect = document.getElementById("chapterSubject");
const chapterModalTitle = document.getElementById("chapterModalTitle");

const API_BASE = "https://quizmaster-backend-cs3d.onrender.com";


document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("user_role");
  const userName = localStorage.getItem("user_name");

  if (!token || !userRole) {
    window.location.href = "../index.html";
    return;
  }

  if (window.location.pathname.includes("admin") && userRole !== "admin") {
    window.location.href = "../index.html";
    return;
  }

  if (userName) {
    const nameElement = document.getElementById("user-name");
    if (nameElement) {
      nameElement.textContent = userName;
    }
  }

});


let subjects = [];

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user_name");
  window.location.href = "../index.html";
}



function openChapterModal(edit = false, chapter = null) {
  chapterModal.classList.remove("hidden");
  chapterModalTitle.textContent = edit ? "Edit Chapter" : "Add New Chapter";
  chapterForm.reset();

  if (edit && chapter) {
    chapterIdInput.value = chapter.id;
    chapterNameInput.value = chapter.name;
    chapterSubjectSelect.value = chapter.subject_id;
  }
}

function closeChapterModal() {
  chapterModal.classList.add("hidden");
}

async function loadSubjects() {
  const res = await fetch(`${API_BASE}/subjects/`);
  subjects = await res.json();
  chapterSubjectSelect.innerHTML = subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}

async function loadChapters() {
  const res = await fetch(`${API_BASE}/chapters/`);
  const chapters = await res.json();

  chapterTableBody.innerHTML = "";

  chapters.forEach(ch => {
    const subject = subjects.find(s => s.id === ch.subject_id);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${ch.name}</td>
      <td>${subject ? subject.name : "Unknown"}</td>
      <td>
        <button class="btn btn-secondary" onclick='editChapter(${JSON.stringify(ch)})'>Edit</button>
        <button class="btn btn-danger" onclick="deleteChapter(${ch.id})">Delete</button>
      </td>
    `;
    chapterTableBody.appendChild(row);
  });
}

chapterForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = chapterIdInput.value;
  const name = chapterNameInput.value;
  const subject_id = chapterSubjectSelect.value;

  const payload = { name, subject_id };

  const res = await fetch(
    id ? `${API_BASE}/chapters/${id}` : `${API_BASE}/chapters/`,
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  if (res.ok) {
    closeChapterModal();
    loadChapters();
  } else {
    alert("Failed to save chapter");
  }
});

async function deleteChapter(id) {
  if (confirm("Are you sure you want to delete this chapter?")) {
    const res = await fetch(`${API_BASE}/chapters/${id}`, { method: "DELETE" });
    if (res.ok) loadChapters();
    else alert("Failed to delete");
  }
}

function editChapter(chapter) {
  openChapterModal(true, chapter);
}

document.getElementById("openAddChapterModal").addEventListener("click", () => openChapterModal());

window.onload = async () => {
  await loadSubjects();
  await loadChapters();
};
