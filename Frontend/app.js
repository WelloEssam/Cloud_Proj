import { convertFileToBase64 } from './upload.js';
import { createTask } from './api.js';
import { getTasks, deleteTask, updateTask } from './taskActions.js';

// 🔐 Cognito Hosted UI Login URL
const loginUrl = "https://eu-north-1nnysqqqte.auth.eu-north-1.amazoncognito.com/login?client_id=3svgphpvop38942rvddn007qoq&response_type=token&scope=email+openid+profile&redirect_uri=http://localhost:5500/Frontend/index.html";

// 🔐 Extract token from URL if coming from redirect
function getTokenFromUrl() {
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.substring(1));
  return params.get("id_token");
}

// 🔐 Store token if present after redirect
const token = getTokenFromUrl();
if (token) {
  localStorage.setItem("idToken", token);
  window.history.replaceState({}, document.title, window.location.pathname);
}

// 🔐 Decode user ID from token
function getUserIdFromToken() {
  const token = localStorage.getItem("idToken");
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub;
  } catch (err) {
    console.error("Token decoding failed", err);
    return null;
  }
}

// 🔐 Show UI based on auth state
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

// 🚀 Task Rendering
async function renderTasks() {
  const userId = getUserIdFromToken();
  const result = await getTasks(userId);

  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  result.data.forEach(task => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${task.title}</strong><br>
      <small>${task.description || ''}</small><br>
      <button onclick="deleteTaskUI('${task.task_id}')">Delete</button>
      <button onclick="editTaskPrompt('${task.task_id}', '${task.title}')">Edit</button>
      <hr>
    `;
    taskList.appendChild(li);
  });
}

// 🌪 Delete task handler
window.deleteTaskUI = async (taskId) => {
  const result = await deleteTask(taskId);
  alert(result.message || result.error);
  await renderTasks();
};

// 📝 Edit task prompt
window.editTaskPrompt = async (taskId, oldTitle) => {
  const newTitle = prompt("Enter new task title:", oldTitle);
  if (newTitle && newTitle !== oldTitle) {
    const result = await updateTask(taskId, { title: newTitle });
    alert(result.message || result.error);
    await renderTasks();
  }
};

// 📤 Create new task
document.getElementById("createTaskBtn").onclick = async () => {
  const title = document.getElementById("taskName").value;
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
    user_id: userId,
    file: file
      ? {
          name: file.name,
          content: fileBase64,
        }
      : null,
  };

  const result = await createTask(task);
  alert(result.message || result.error);
  await renderTasks();
};

// 🚪 Logout
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("idToken");
  location.reload();
};
