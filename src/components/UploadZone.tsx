import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isUploading }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB limit for Netlify
    disabled: isUploading,
  } as any);

  const isFileTooLarge = fileRejections.length > 0 && fileRejections[0].errors[0].code === "file-too-large";

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
          ${isFileTooLarge ? "border-red-400 bg-red-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isFileTooLarge ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          }`}>
            <Upload size={32} />
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-800">
              {isDragActive ? "Drop the image here" : "Drag & drop your photo"}
            </p>
            <p className="text-gray-500 mt-1">or click to browse (JPG, PNG)</p>
          </div>
          <div className="flex gap-2 text-xs text-gray-400 mt-4">
            <ImageIcon size={14} />
            <span>Max file size: 5MB</span>
          </div>
        </div>
      </div>
      {isFileTooLarge && (
        <p className="text-red-500 text-sm font-medium text-center">
          File is too large. Please upload an image smaller than 5MB.
        </p>
      )}
    </div>
  );
};
