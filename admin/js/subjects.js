const API_URL = "https://quizmaster-backend-cs3d.onrender.com";

const subjectTableBody = document.getElementById("subject-table-body");
const subjectModal = document.getElementById("subjectModal");
const subjectForm = document.getElementById("subjectForm");
const subjectIdInput = document.getElementById("subjectId");
const subjectNameInput = document.getElementById("subjectName");
const subjectDescriptionInput = document.getElementById("subjectDescription");
const subjectModalTitle = document.getElementById("subjectModalTitle");
const openAddSubjectModalBtn = document.getElementById("openAddSubjectModal");

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}
function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}


function showNotification(message, isSuccess = true) {
    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function openSubjectModal(isEdit = false, subject = null) {
  subjectForm.reset(); 
  
  if (isEdit && subject) {
    subjectModalTitle.textContent = "Edit Subject";
    subjectIdInput.value = subject.id;
    subjectNameInput.value = subject.name;
    subjectDescriptionInput.value = subject.description;
  } else {
    subjectModalTitle.textContent = "Add New Subject";
    subjectIdInput.value = ""; 
  }
  
  subjectModal.classList.remove("hidden");
}

function closeSubjectModal() {
  subjectModal.classList.add("hidden");
}

async function fetchSubjects() {
  try {
    const res = await fetch(`${API_URL}/subjects/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch subjects. Please ensure you are logged in as an admin.");
    
    const subjects = await res.json();
    renderSubjects(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    showNotification(error.message, false);
  }
}

function renderSubjects(subjects) {
  subjectTableBody.innerHTML = "";
  if (!subjects || subjects.length === 0) {
    subjectTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No subjects found.</td></tr>`;
    return;
  }

  subjects.forEach((subj) => {
    const row = document.createElement("tr");
    const subjectData = JSON.stringify(subj).replace(/'/g, "'");

    row.innerHTML = `
      <td>${subj.name}</td>
      <td>${subj.description || 'No description'}</td>
      <td class="actions">
        <button class="btn btn-secondary" onclick='openSubjectModal(true, ${subjectData})'>Edit</button>
        <button class="btn btn-danger" onclick="deleteSubject(${subj.id})">Delete</button>
      </td>
    `;
    subjectTableBody.appendChild(row);
  });
}

async function deleteSubject(id) {
  if (!confirm("Are you sure you want to delete this subject and all its related chapters and quizzes?")) return;

  try {
    const res = await fetch(`${API_URL}/subjects/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    
    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to delete subject");
    }
    
    showNotification("Subject deleted successfully.", true);
    fetchSubjects();
  } catch (error) {
    console.error("Error deleting subject:", error);
    showNotification(error.message, false);
  }
}

subjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = subjectIdInput.value;
  const isEdit = !!id; 

  const subjectData = {
    name: subjectNameInput.value.trim(),
    description: subjectDescriptionInput.value.trim(),
  };

  if (!subjectData.name) {
    showNotification("Subject name is required.", false);
    return;
  }
  
  const url = isEdit ? `${API_URL}/subjects/${id}` : `${API_URL}/subjects/`;
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: getHeaders(),
      body: JSON.stringify(subjectData),
    });

    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to save subject.");
    }

    showNotification(`Subject ${isEdit ? 'updated' : 'added'} successfully!`, true);
    closeSubjectModal();
    fetchSubjects();
  } catch (error) {
    console.error("Error saving subject:", error);
    showNotification(error.message, false);
  }
});

openAddSubjectModalBtn.addEventListener("click", () => openSubjectModal(false));


document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "../index.html"; 
        return;
    }
    fetchSubjects();
});