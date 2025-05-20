// api.js
import { config } from './config.js';

export const createTask = async (taskData) => {
  const token = localStorage.getItem("idToken");

  const response = await fetch(`${config.apiBaseUrl}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  });

  const result = await response.json();
  return result;
};
