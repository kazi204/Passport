import axios from "axios";

const api = axios.create({
  baseURL: "/",
});

export const checkHealth = async () => {
  try {
    const response = await api.get("/api/health");
    return response.data;
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
};

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const removeBackground = async (filename: string) => {
  const response = await api.post("/api/remove-bg", { filename });
  return response.data;
};

export const generateLayout = async (data: {
  filename: string;
  bgColor: string;
  size: string;
  customWidth?: number;
  customHeight?: number;
  copies: number;
}) => {
  const response = await api.post("/api/generate-layout", data);
  return response.data;
};

export const generateSingle = async (data: {
  filename: string;
  bgColor: string;
  size: string;
  customWidth?: number;
  customHeight?: number;
}) => {
  const response = await api.post("/api/generate-single", data);
  return response.data;
};

export const downloadPdf = async (filename: string) => {
  const response = await api.post("/api/download-pdf", { filename }, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "passport-photos.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const downloadPng = async (filename: string) => {
  try {
    const response = await api.get(`/uploads/${filename}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "passport-photo-layout.png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error: any) {
    console.error("Download PNG failed:", error);
    if (error.response?.status === 404) {
      throw new Error("The processed image was not found on the server. This can happen in serverless environments like Netlify if the function instance was recycled.");
    }
    throw error;
  }
};
