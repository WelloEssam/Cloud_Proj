// auth.js
import { config } from './config.js';  // ✅ THIS is what was missing

import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
} from "https://cdn.skypack.dev/@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: config.region });

export const signUp = async (email, password) => {
  const command = new SignUpCommand({
    ClientId: config.clientId,
    Username: email,
    Password: password,
  });

  try {
    const response = await client.send(command);
    return { success: true, response };
  } catch (error) {
    console.error("SignUp error:", error);
    return { success: false, error: error.message };
  }
};

export const login = async (email, password) => {
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  try {
    const response = await client.send(command);
    const idToken = response.AuthenticationResult.IdToken;
    localStorage.setItem("idToken", idToken);
    return { success: true, idToken };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
};

export const logout = () => {
  localStorage.removeItem("idToken");
};

export const getUserIdFromToken = () => {
  const token = localStorage.getItem("idToken");
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub; // Cognito user ID
  } catch (err) {
    console.error("Token decode error:", err);
    return null;
  }
};
