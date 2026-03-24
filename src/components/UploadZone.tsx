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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    multiple: false,
    disabled: isUploading,
  } as any);

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}
        ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
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
          <span>High quality photos work best</span>
        </div>
      </div>
    </div>
  );
};
