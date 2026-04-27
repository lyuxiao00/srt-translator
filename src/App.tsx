import { useState } from 'react';
import React from 'react';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<'himalaya_lrc' | 'xiaoyuzhou_timestamps'>('himalaya_lrc');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const translateSRT = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const content = await file.text();
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = mode === 'himalaya_lrc' 
        ? `You are an expert SRT to LRC translator. Convert the following SRT content into an LRC format file. 
        For the text content of each line, follow this rule: "Original English Text | Chinese Translation". 
        The timestamp format MUST be [mm:ss.xx]. 
        Only return the LRC content.
        
        SRT Content:
        ${content}`
        : `You are an expert podcast show notes generator. Convert the following SRT content into a list of key timestamps for the "XiaoYuzhou" (小宇宙) app.
        Format each line as: "mm:ss English | Chinese". 
        IMPORTANT: The total length of the output MUST NOT exceed 5000 characters. If the content is too long, summarize or select the most important segments.
        Only return the timestamp list.

        SRT Content:
        ${content}`;
      
      let retries = 3;
      while (retries > 0) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
          });
          setTranslatedText(response.text || '');
          break; // Success
        } catch (error) {
          console.error(`Attempt ${4 - retries} failed:`, error);
          retries--;
          if (retries === 0) {
            alert('Translation failed after multiple attempts. Please try again later.');
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
          }
        }
      }
    } catch (error) {
      console.error('File reading failed:', error);
      alert('Failed to read the file.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTranslatedText('');
    setLoading(false);
  };

  const downloadTranslated = () => {
    const extension = mode === 'himalaya_lrc' ? 'lrc' : 'txt';
    const prefix = mode === 'himalaya_lrc' ? 'Himalaya_' : 'XiaoYuzhou_';
    const blob = new Blob([translatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = file?.name?.replace(/\.[^/.]+$/, "") || 'file';
    a.download = `${prefix}${baseName}.${extension}`;
    a.click();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Podcast Content Tool</h1>
      <p className="text-gray-600">Prepare podcast content for Himalaya (LRC) and XiaoYuzhou (Timestamps).</p>
      
      <input 
        key={file ? 'loaded' : 'empty'}
        type="file" 
        accept=".srt" 
        onChange={handleFileChange} 
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
      />
      
      <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="himalaya_lrc" checked={mode === 'himalaya_lrc'} onChange={() => setMode('himalaya_lrc')} className="w-4 h-4 text-blue-600" /> 
          <span className="text-sm font-medium text-gray-700">Himalaya (LRC Bilingual |)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="xiaoyuzhou_timestamps" checked={mode === 'xiaoyuzhou_timestamps'} onChange={() => setMode('xiaoyuzhou_timestamps')} className="w-4 h-4 text-blue-600" /> 
          <span className="text-sm font-medium text-gray-700">XiaoYuzhou (5000 chars Timestamps)</span>
        </label>
      </div>
      
      <div className="flex gap-4">
        <button 
          onClick={translateSRT} 
          disabled={!file || loading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : 'Generate Content'}
        </button>
        { (file || translatedText) && !loading && (
          <button 
            onClick={reset}
            className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {translatedText && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold capitalize text-gray-800">{mode.replace(/_/g, ' ')} Result</h2>
            <span className={`text-xs font-medium ${translatedText.length > 5000 ? 'text-red-500' : 'text-gray-400'}`}>
              {translatedText.length} / 5000 characters
            </span>
          </div>
          <textarea 
            value={translatedText} 
            readOnly 
            className="w-full h-96 p-4 border border-gray-200 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm" 
          />
          <button 
            onClick={downloadTranslated} 
            className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            Download {mode === 'himalaya_lrc' ? 'LRC' : 'TXT'} File
          </button>
        </div>
      )}
    </div>
  );
}
