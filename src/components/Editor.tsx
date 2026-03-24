import React from "react";
import { ChromePicker } from "react-color";
import { Settings, Users, Maximize, Palette } from "lucide-react";

interface EditorProps {
  bgColor: string;
  setBgColor: (color: string) => void;
  size: string;
  setSize: (size: string) => void;
  customWidth: number;
  setCustomWidth: (w: number) => void;
  customHeight: number;
  setCustomHeight: (h: number) => void;
  copies: number;
  setCopies: (copies: number) => void;
  onGenerate: () => void;
  isProcessing: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  bgColor,
  setBgColor,
  size,
  setSize,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  copies,
  setCopies,
  onGenerate,
  isProcessing,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-8">
      {/* Background Color */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
          <Palette size={18} />
          <span>Background Color</span>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {["#ffffff", "#3b82f6", "#ef4444", "#10b981"].map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  bgColor === color ? "border-blue-500 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <ChromePicker
            color={bgColor}
            onChange={(color) => setBgColor(color.hex)}
            disableAlpha
            styles={{ default: { picker: { width: "100%", boxShadow: "none", border: "1px solid #eee" } } }}
          />
        </div>
      </section>

      {/* Size Selection */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
          <Maximize size={18} />
          <span>Passport Size</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSize("us")}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
              size === "us" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-100 hover:border-gray-200 text-gray-600"
            }`}
          >
            US (2x2")
          </button>
          <button
            onClick={() => setSize("eu")}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
              size === "eu" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-100 hover:border-gray-200 text-gray-600"
            }`}
          >
            EU (35x45mm)
          </button>
          <button
            onClick={() => setSize("custom")}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all col-span-2 ${
              size === "custom" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-100 hover:border-gray-200 text-gray-600"
            }`}
          >
            40 x 50 mm
          </button>
          <button
            onClick={() => setSize("manual")}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all col-span-2 ${
              size === "manual" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-100 hover:border-gray-200 text-gray-600"
            }`}
          >
            Custom Size (mm)
          </button>
        </div>

        {size === "manual" && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase font-bold">Width (mm)</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase font-bold">Height (mm)</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                className="p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </section>

      {/* Copies */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
          <Users size={18} />
          <span>Number of Copies</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="24"
            value={copies}
            onChange={(e) => setCopies(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="w-8 text-center font-bold text-blue-600">{copies}</span>
        </div>
      </section>

      <button
        onClick={onGenerate}
        disabled={isProcessing}
        className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-200
          ${isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"}`}
      >
        {isProcessing ? "Processing..." : "Generate Layout"}
      </button>
    </div>
  );
};
