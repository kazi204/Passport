import { useState } from "react";
import { UploadZone } from "./components/UploadZone";
import { Editor } from "./components/Editor";
import { uploadImage, removeBackground, generateLayout, generateSingle, downloadPdf, downloadPng } from "./services/api";
import { Download, RefreshCw, CheckCircle2, AlertCircle, Printer, FileDown, Image } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [noBgFilename, setNoBgFilename] = useState<string | null>(null);
  const [layoutFilename, setLayoutFilename] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState("eu");
  const [customWidth, setCustomWidth] = useState(40);
  const [customHeight, setCustomHeight] = useState(50);
  const [copies, setCopies] = useState(4);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const data = await uploadImage(file);
      setFilename(data.filename);
      setOriginalImage(URL.createObjectURL(file));
      
      // Automatically remove background
      setIsRemovingBg(true);
      const bgData = await removeBackground(data.filename);
      setNoBgFilename(bgData.filename);
    } catch (err: any) {
      setError("Failed to upload or process image. Please try again.");
    } finally {
      setIsUploading(false);
      setIsRemovingBg(false);
    }
  };

  const handleGenerate = async () => {
    const activeFilename = noBgFilename || filename;
    if (!activeFilename) {
      if (isRemovingBg || isUploading) {
        setError("Image is still processing. Please wait a moment.");
      } else {
        setError("Please upload an image first.");
      }
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateLayout({
        filename: activeFilename,
        bgColor,
        size,
        customWidth: size === "manual" ? customWidth : undefined,
        customHeight: size === "manual" ? customHeight : undefined,
        copies
      });
      setLayoutFilename(data.filename);
    } catch (err) {
      setError("Failed to generate layout.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = async () => {
    const activeFilename = noBgFilename || filename;
    if (!activeFilename) {
      setError("Please upload an image first.");
      return;
    }
    setIsGeneratingSingle(true);
    setError(null);
    try {
      const data = await generateSingle({
        filename: activeFilename,
        bgColor,
        size,
        customWidth: size === "manual" ? customWidth : undefined,
        customHeight: size === "manual" ? customHeight : undefined,
      });
      await downloadPng(data.filename);
    } catch (err) {
      setError("Failed to generate single image.");
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setFilename(null);
    setNoBgFilename(null);
    setLayoutFilename(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Printer size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Passport<span className="text-blue-600">Pro</span></h1>
          </div>
          {originalImage && (
            <button 
              onClick={reset}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw size={16} />
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!originalImage ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto mt-12"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Create Perfect Passport Photos</h2>
                <p className="text-lg text-slate-500">AI-powered background removal and professional print layouts in seconds.</p>
              </div>
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />
              
              <div className="grid grid-cols-3 gap-6 mt-16">
                {[
                  { icon: <CheckCircle2 className="text-green-500" />, title: "AI Background", desc: "Instant removal" },
                  { icon: <CheckCircle2 className="text-green-500" />, title: "Print Ready", desc: "A4 Layouts" },
                  { icon: <CheckCircle2 className="text-green-500" />, title: "Standard Sizes", desc: "US, EU & more" },
                ].map((feature, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-2">
                    {feature.icon}
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid lg:grid-cols-[400px_1fr] gap-8 items-start"
            >
              {/* Sidebar Controls */}
              <div className="space-y-6">
                <Editor 
                  bgColor={bgColor}
                  setBgColor={setBgColor}
                  size={size}
                  setSize={setSize}
                  customWidth={customWidth}
                  setCustomWidth={setCustomWidth}
                  customHeight={customHeight}
                  setCustomHeight={setCustomHeight}
                  copies={copies}
                  setCopies={setCopies}
                  onGenerate={handleGenerate}
                  isProcessing={isGenerating || isRemovingBg}
                />
                
                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
              </div>

              {/* Preview Area */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden">
                {isRemovingBg ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Removing background...</p>
                  </div>
                ) : layoutFilename ? (
                  <div className="w-full flex flex-col items-center gap-8">
                    <div className="relative group">
                      <img 
                        src={`/uploads/${layoutFilename}`} 
                        alt="Final Layout" 
                        className="max-h-[70vh] shadow-2xl rounded-sm border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    
                    <div className="flex flex-wrap gap-4 justify-center">
                      <button 
                        onClick={() => downloadPng(layoutFilename)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all"
                      >
                        <Download size={18} />
                        Download Layout (PNG)
                      </button>
                      <button 
                        onClick={() => downloadPdf(layoutFilename)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all"
                      >
                        <FileDown size={18} />
                        Download Layout (PDF)
                      </button>
                      <button 
                        onClick={handleDownloadSingle}
                        disabled={isGeneratingSingle}
                        className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                      >
                        {isGeneratingSingle ? (
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Image size={18} />
                        )}
                        Download Single Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <img 
                        src={originalImage} 
                        alt="Preview" 
                        className="max-h-[50vh] rounded-2xl shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                      {noBgFilename && (
                        <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                          <CheckCircle2 size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-slate-400 text-sm">Adjust settings on the left to generate your layout</p>
                      {noBgFilename && (
                        <button 
                          onClick={handleDownloadSingle}
                          disabled={isGeneratingSingle}
                          className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          {isGeneratingSingle ? (
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Image size={18} />
                          )}
                          Download Single Photo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
