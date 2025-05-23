import { convertFileToBase64 } from './upload.js';
import { createTask } from './api.js';
import { getTasks, deleteTask, updateTask } from './taskActions.js';

// AWS Cognito Hosted UI login URL
const redirectUri = window.location.origin + "/index.html";
const loginUrl = `https://eu-north-1nnysqqqte.auth.eu-north-1.amazoncognito.com/login?client_id=3svgphpvop38942rvddn007qoq&response_type=token&scope=email+openid+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;

// Extract token from URL (after login redirect)
function getTokenFromUrl() {
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.substring(1));
  return params.get("id_token");
}

// Store token and clean URL
const token = getTokenFromUrl();
if (token) {
  localStorage.setItem("idToken", token);
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Decode user ID from token
function getUserIdFromToken() {
  const token = localStorage.getItem("idToken");
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)).sub;
  } catch (err) {
    console.error("Token decoding failed", err);
    return null;
  }
}

// Auth-based UI toggle
if (localStorage.getItem("idToken")) {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("task-section").style.display = "block";
  renderTasks();
} else {
  document.getElementById("task-section").style.display = "none";
  document.getElementById("loginWithCognito").addEventListener("click", () => {
    window.location.href = loginUrl;
  });
}

// Render all tasks
async function renderTasks() {
  const userId = getUserIdFromToken();
  const result = await getTasks();

  const pendingList = document.getElementById("pendingTasks");
  const completeList = document.getElementById("completedTasks");
  pendingList.innerHTML = "";
  completeList.innerHTML = "";

  result.data
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach(task => {
      const card = document.createElement("div");
      card.className = "task-card";

      card.innerHTML = `
        <strong>${task.title}</strong>
        <p>${task.description || ''}</p>
        ${task.attachment_url ? `<a href="${task.attachment_url}" target="_blank">📎 Attachment</a>` : ''}
        <em>Status: ${task.status}</em>
        <div style="margin-top: 0.6rem;">
          <button onclick="deleteTaskUI('${task.task_id}')">Delete</button>
          <button onclick="editTaskPrompt('${task.task_id}', '${task.title}')">Edit</button>
          ${task.status !== 'complete' ? `<button onclick="markTaskComplete('${task.task_id}')">Task Complete</button>` : ''}
        </div>
      `;

      (task.status === "complete" ? completeList : pendingList).appendChild(card);
    });
}

// Delete task
window.deleteTaskUI = async (taskId) => {
  const result = await deleteTask(taskId);
  alert(result.message || result.error);
  await renderTasks();
};

// Edit task
window.editTaskPrompt = async (taskId, oldTitle) => {
  const newTitle = prompt("Enter new task title:", oldTitle);
  if (newTitle && newTitle !== oldTitle) {
    const result = await updateTask(taskId, { title: newTitle });
    alert(result.message || result.error);
    await renderTasks();
  }
};

// Mark task complete
window.markTaskComplete = async (taskId) => {
  const result = await updateTask(taskId, { status: "complete" });
  alert(result.message || result.error);
  await renderTasks();
};

// Create task
document.getElementById("createTaskBtn").onclick = async () => {
  const title = document.getElementById("taskName").value;
  const description = document.getElementById("taskDescription").value;
  const file = document.getElementById("fileInput").files[0];
  const userId = getUserIdFromToken();

  if (!userId) {
    alert("User not authenticated.");
    return;
  }

  let fileBase64 = "";
  if (file) {
    fileBase64 = await convertFileToBase64(file);
  }

  const task = {
    title,
    description,
    user_id: userId,
    file: file ? { name: file.name, content: fileBase64 } : null,
  };

  const result = await createTask(task);
  alert(result.message || result.error);
  await renderTasks();
};

// Logout
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("idToken");
  location.reload();
};
