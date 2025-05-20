// upload.js
export const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64 = reader.result.split(",")[1]; // Strip "data:*/*;base64," prefix
      resolve(base64);
    };

    reader.onerror = (error) => reject(error);
  });
};
