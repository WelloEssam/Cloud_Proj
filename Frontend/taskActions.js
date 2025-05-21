// ✅ Updated taskActions.js (Frontend)
import { config } from './config.js';

export const getTasks = async () => {
  const token = localStorage.getItem("idToken");

  const response = await fetch(`${config.apiBaseUrl}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};

export const getTask = async (taskId) => {
  const token = localStorage.getItem("idToken");

  const response = await fetch(`${config.apiBaseUrl}/task?task_id=${taskId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};

export const updateTask = async (taskId, updates) => {
  const token = localStorage.getItem("idToken");

  const response = await fetch(`${config.apiBaseUrl}/tasks?task_id=${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  return await response.json();
};

export const deleteTask = async (taskId) => {
  const token = localStorage.getItem("idToken");

  const response = await fetch(`${config.apiBaseUrl}/tasks?task_id=${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
};
