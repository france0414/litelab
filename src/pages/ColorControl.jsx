import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Download,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Palette,
  Wand2,
  Sparkles,
  Bot,
  Loader2,
  ImagePlus,
  X,
  FileArchive,
  Trash2
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  brightness: 100,
  saturation: 100,
  contrast: 100,
  globalHue: 0,
  sepia: 0,
  shadows: 0,
  highlights: 0,
  temperature: 0,
  tint: 0
};

const DEFAULT_ADVANCED = {
  enabled: true,
  targetHue: 60,
  tolerance: 30,
  hueShift: 0,
  satShift: 0,
};

const MAX_IMAGES = 30;
const MAX_HISTORY = 20;

const cloneSettings = (settings) => ({ ...settings });
const cloneAdvanced = (advanced) => ({ ...advanced });

// OKLab 色彩科學工具 (Perceptually Uniform Color Space)
function srgbToLinear(c) {
  c /= 255;
  return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
}

function linearToSrgb(c) {
  c = c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

function rgbToOklab(r, g, b) {
  let lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  let l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  let m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  let s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  let l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720403 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  ];
}

function oklabToRgb(L, a, b) {
  let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  let s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  let l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

  let lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// 輔助函式：從 OKLab 提取 Hue
function oklabToHsl(L, a, b) {
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  let s = Math.sqrt(a * a + b * b);
  return [h, s, L];
}

// RGB 轉 HSL (保持舊版相容或輔助使用)
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

const ColorControl = () => {
  const [imageList, setImageList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 參考圖片狀態
  const [refImageSrc, setRefImageSrc] = useState(null);
  const [refImageObj, setRefImageObj] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // AI 相關狀態
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('gemini_api_key') || "";
    } catch (err) {
      console.warn('Failed to read Gemini API key from localStorage', err);
      return "";
    }
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiError, setAiError] = useState("");
  const [applyAiToAll, setApplyAiToAll] = useState(false);

  const fileInputRef = useRef(null);
  const refFileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const advancedTimeoutRef = useRef(null);
  const advancedRafRef = useRef(null);

  const currentItem = imageList[currentIndex] || null;
  const currentSettings = currentItem?.settings || DEFAULT_SETTINGS;
  const currentAdvanced = currentItem?.advanced || DEFAULT_ADVANCED;
  const currentImageObj = currentItem?.imageObj || null;
  const canUndo = Boolean(currentItem?.history && currentItem.historyIndex > 0);
  const canRedo = Boolean(currentItem?.history && currentItem.historyIndex < currentItem.history.length - 1);

  const loadJSZip = () => {
    return new Promise((resolve) => {
      if (window.JSZip) return resolve(window.JSZip);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve(window.JSZip);
      document.head.appendChild(script);
    });
  };

  const updateCurrentItem = (updates) => {
    setImageList(prev => prev.map((item, idx) =>
      idx === currentIndex ? { ...item, ...updates } : item
    ));
  };

  const pushHistoryForIndex = (index, nextSettings, nextAdvanced) => {
    setImageList(prev => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;

      const historyBase = Array.isArray(item.history) ? item.history : [];
      const baseIndex = typeof item.historyIndex === 'number' ? item.historyIndex : historyBase.length - 1;
      const trimmed = historyBase.slice(0, baseIndex + 1);
      const nextEntry = {
        settings: cloneSettings(nextSettings),
        advanced: cloneAdvanced(nextAdvanced)
      };
      const nextHistory = [...trimmed, nextEntry];
      let nextHistoryIndex = nextHistory.length - 1;

      if (nextHistory.length > MAX_HISTORY) {
        const overflow = nextHistory.length - MAX_HISTORY;
        nextHistory.splice(0, overflow);
        nextHistoryIndex = Math.max(0, nextHistoryIndex - overflow);
      }

      next[index] = {
        ...item,
        settings: cloneSettings(nextSettings),
        advanced: cloneAdvanced(nextAdvanced),
        history: nextHistory,
        historyIndex: nextHistoryIndex
      };
      return next;
    });
  };

  const resetHistoryForIndex = (index, nextSettings, nextAdvanced) => {
    setImageList(prev => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      next[index] = {
        ...item,
        settings: cloneSettings(nextSettings),
        advanced: cloneAdvanced(nextAdvanced),
        history: [{ settings: cloneSettings(nextSettings), advanced: cloneAdvanced(nextAdvanced) }],
        historyIndex: 0
      };
      return next;
    });
  };

  const updateCurrentSettings = (partialSettings) => {
    if (!currentItem) return;
    const nextSettings = { ...currentSettings, ...partialSettings };
    pushHistoryForIndex(currentIndex, nextSettings, currentAdvanced);
  };

  const updateCurrentAdvanced = (partialAdvanced) => {
    if (!currentItem) return;
    const nextAdvanced = { ...currentAdvanced, ...partialAdvanced };
    pushHistoryForIndex(currentIndex, currentSettings, nextAdvanced);
  };

  const handleUndo = () => {
    if (!currentItem?.history || currentItem.historyIndex <= 0) return;
    setImageList(prev => {
      const next = [...prev];
      const item = next[currentIndex];
      if (!item?.history) return prev;
      const nextIndex = item.historyIndex - 1;
      if (nextIndex < 0) return prev;
      const entry = item.history[nextIndex];
      if (!entry) return prev;
      next[currentIndex] = {
        ...item,
        settings: cloneSettings(entry.settings),
        advanced: cloneAdvanced(entry.advanced),
        historyIndex: nextIndex
      };
      return next;
    });
  };

  const handleRedo = () => {
    if (!currentItem?.history) return;
    if (currentItem.historyIndex >= currentItem.history.length - 1) return;
    setImageList(prev => {
      const next = [...prev];
      const item = next[currentIndex];
      if (!item?.history) return prev;
      const nextIndex = item.historyIndex + 1;
      const entry = item.history[nextIndex];
      if (!entry) return prev;
      next[currentIndex] = {
        ...item,
        settings: cloneSettings(entry.settings),
        advanced: cloneAdvanced(entry.advanced),
        historyIndex: nextIndex
      };
      return next;
    });
  };

  const handleResetCurrent = () => {
    if (!currentItem) return;
    pushHistoryForIndex(currentIndex, { ...DEFAULT_SETTINGS }, { ...DEFAULT_ADVANCED });
  };

  const removeImageAt = (indexToRemove) => {
    const target = imageList[indexToRemove];
    const label = target?.name ? `「${target.name}」` : `第 ${indexToRemove + 1} 張`;
    const shouldRemove = window.confirm(`確定要刪除 ${label} 嗎？此動作無法復原。`);
    if (!shouldRemove) return;
    setImageList(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (prev.length === 0) return next;
      if (indexToRemove === currentIndex) {
        const nextIndex = next.length === 0
          ? -1
          : Math.min(indexToRemove, next.length - 1);
        setCurrentIndex(nextIndex);
      } else if (indexToRemove < currentIndex) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      return next;
    });
  };

  const applyCurrentToAll = () => {
    if (!currentItem) return;
    const nextSettings = cloneSettings(currentSettings);
    const nextAdvanced = cloneAdvanced(currentAdvanced);
    setImageList(prev => prev.map((item, idx) => {
      if (idx === currentIndex) return item;
      return {
        ...item,
        settings: cloneSettings(nextSettings),
        advanced: cloneAdvanced(nextAdvanced),
        history: [{ settings: cloneSettings(nextSettings), advanced: cloneAdvanced(nextAdvanced) }],
        historyIndex: 0
      };
    }));
  };

  // 載入參考圖片物件
  useEffect(() => {
    if (!refImageSrc) {
      setRefImageObj(null);
      return;
    }
    const img = new Image();
    img.onload = () => setRefImageObj(img);
    img.src = refImageSrc;
  }, [refImageSrc]);

  // 處理並繪製預覽圖片
  useEffect(() => {
    if (!currentImageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const MAX_PREVIEW_SIZE = 1000;
    let width = currentImageObj.width;
    let height = currentImageObj.height;

    if (width > MAX_PREVIEW_SIZE || height > MAX_PREVIEW_SIZE) {
      const ratio = Math.min(MAX_PREVIEW_SIZE / width, MAX_PREVIEW_SIZE / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    // 1. 全域濾鏡 (CSS Filter 作為基礎)
    ctx.filter = `brightness(${currentSettings.brightness}%) saturate(${currentSettings.saturation}%) contrast(${currentSettings.contrast}%) hue-rotate(${currentSettings.globalHue}deg) sepia(${currentSettings.sepia}%)`;
    ctx.drawImage(currentImageObj, 0, 0, canvas.width, canvas.height);

    // 2. 進階像素運算 (OKLab 專業調色)
    const shouldRunAdvanced = 
      currentAdvanced.enabled && (currentAdvanced.satShift !== 0 || currentAdvanced.hueShift !== 0) ||
      currentSettings.shadows !== 0 || currentSettings.highlights !== 0 ||
      currentSettings.temperature !== 0 || currentSettings.tint !== 0;

    if (shouldRunAdvanced) {
      if (advancedTimeoutRef.current) clearTimeout(advancedTimeoutRef.current);
      if (advancedRafRef.current) cancelAnimationFrame(advancedRafRef.current);

      advancedTimeoutRef.current = setTimeout(() => {
        advancedRafRef.current = requestAnimationFrame(() => {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const shadowAdj = currentSettings.shadows / 500;
          const highlightAdj = currentSettings.highlights / 500;
          const tempAdj = currentSettings.temperature / 1000;
          const tintAdj = currentSettings.tint / 1000;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            let [L, a, b_] = rgbToOklab(r, g, b);

            // A. 陰影與高光 (基於 L 通道)
            if (L < 0.5) {
              const weight = Math.pow(1 - L * 2, 2);
              L += shadowAdj * weight;
            } else {
              const weight = Math.pow((L - 0.5) * 2, 2);
              L += highlightAdj * weight;
            }
            L = Math.max(0, Math.min(1, L));

            // B. 色溫與色調 (調整 a, b 通道)
            b_ += tempAdj; // 正值變黃(暖)，負值變藍(冷)
            a += tintAdj; // 正值變洋紅，負值變綠

            // C. 選項色相移動 (OKLab 距離演算法)
            if (currentAdvanced.enabled) {
              let [h, s] = oklabToHsl(L, a, b_);
              let dist = Math.abs(h - currentAdvanced.targetHue);
              if (dist > 180) dist = 360 - dist;

              if (dist <= currentAdvanced.tolerance) {
                const weight = Math.pow(1 - (dist / currentAdvanced.tolerance), 2);
                h = (h + (currentAdvanced.hueShift * weight) + 360) % 360;
                const satAdjust = currentAdvanced.satShift / 100;
                s = Math.max(0, s + (satAdjust * weight * s));
                
                // 轉回 a, b
                const rad = h * (Math.PI / 180);
                a = Math.cos(rad) * s;
                b_ = Math.sin(rad) * s;
              }
            }

            const [nr, ng, nb] = oklabToRgb(L, a, b_);
            data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
          }
          ctx.putImageData(imageData, 0, 0);
        });
      }, 120);
      return () => {
        if (advancedTimeoutRef.current) clearTimeout(advancedTimeoutRef.current);
        if (advancedRafRef.current) cancelAnimationFrame(advancedRafRef.current);
      };
    }
  }, [currentImageObj, currentSettings, currentAdvanced]);

  const handleImagesUpload = (files) => {
    const remaining = Math.max(0, MAX_IMAGES - imageList.length);
    if (remaining === 0) {
      window.alert(`單次最多可加入 ${MAX_IMAGES} 張圖片，請先清空或下載後再上傳。`);
      return;
    }

    const allFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    const filesToAdd = allFiles.slice(0, remaining);
    if (filesToAdd.length < allFiles.length) {
      window.alert(`已超過上限，僅加入前 ${remaining} 張圖片。`);
    }

    filesToAdd.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        const img = new Image();
        img.onload = () => {
          const item = {
            id: Date.now() + Math.random(),
            name: file.name.split('.')[0],
            src,
            imageObj: img,
            settings: { ...DEFAULT_SETTINGS },
            advanced: { ...DEFAULT_ADVANCED },
            history: [{ settings: { ...DEFAULT_SETTINGS }, advanced: { ...DEFAULT_ADVANCED } }],
            historyIndex: 0
          };
          setImageList(prev => {
            const next = [...prev, item];
            if (prev.length === 0 && index === 0) setCurrentIndex(0);
            return next;
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  };

  const renderAdjustedCanvas = (item) => {
    if (!item?.imageObj) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = item.imageObj.width;
    canvas.height = item.imageObj.height;

    const settings = item.settings || DEFAULT_SETTINGS;
    const advanced = item.advanced || DEFAULT_ADVANCED;

    ctx.filter = `brightness(${settings.brightness}%) saturate(${settings.saturation}%) contrast(${settings.contrast}%) hue-rotate(${settings.globalHue}deg) sepia(${settings.sepia}%)`;
    ctx.drawImage(item.imageObj, 0, 0, canvas.width, canvas.height);

    const shouldRunAdvanced = 
      advanced.enabled && (advanced.satShift !== 0 || advanced.hueShift !== 0) ||
      settings.shadows !== 0 || settings.highlights !== 0 ||
      settings.temperature !== 0 || settings.tint !== 0;

    if (shouldRunAdvanced) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const shadowAdj = settings.shadows / 500;
      const highlightAdj = settings.highlights / 500;
      const tempAdj = settings.temperature / 1000;
      const tintAdj = settings.tint / 1000;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let [L, a, b_] = rgbToOklab(r, g, b);

        if (L < 0.5) {
          const weight = Math.pow(1 - L * 2, 2);
          L += shadowAdj * weight;
        } else {
          const weight = Math.pow((L - 0.5) * 2, 2);
          L += highlightAdj * weight;
        }
        L = Math.max(0, Math.min(1, L));

        b_ += tempAdj;
        a += tintAdj;

        if (advanced.enabled) {
          let [h, s] = oklabToHsl(L, a, b_);
          let dist = Math.abs(h - advanced.targetHue);
          if (dist > 180) dist = 360 - dist;

          if (dist <= advanced.tolerance) {
            const weight = Math.pow(1 - (dist / advanced.tolerance), 2);
            h = (h + (advanced.hueShift * weight) + 360) % 360;
            const satAdjust = advanced.satShift / 100;
            s = Math.max(0, s + (satAdjust * weight * s));
            const rad = h * (Math.PI / 180);
            a = Math.cos(rad) * s;
            b_ = Math.sin(rad) * s;
          }
        }

        const [nr, ng, nb] = oklabToRgb(L, a, b_);
        data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
  };

  const handleDownloadCurrent = () => {
    if (!currentItem) return;
    setIsProcessing(true);

    setTimeout(() => {
      const canvas = renderAdjustedCanvas(currentItem);
      if (!canvas) {
        setIsProcessing(false);
        return;
      }
      const link = document.createElement('a');
      link.download = `${currentItem.name || 'color-adjusted'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsProcessing(false);
    }, 50);
  };

  const handleBatchDownload = async () => {
    if (imageList.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();
      imageList.forEach((item, idx) => {
        const canvas = renderAdjustedCanvas(item);
        if (!canvas) return;
        const base64Data = canvas.toDataURL('image/png').split(',')[1];
        const name = item.name || `img_${idx + 1}`;
        zip.file(`${name}.png`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `color_control_${new Date().getTime()}.zip`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const getResizedBase64 = (img) => {
    const canvas = document.createElement('canvas');
    const maxSize = 512;
    let width = img.width;
    let height = img.height;
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const applyAiResult = (data, applyToAll) => {
    if (!data) return;
    const nextSettings = { ...DEFAULT_SETTINGS, ...data.settings };
    const nextAdvanced = { ...DEFAULT_ADVANCED, ...data.advanced };
    setImageList(prev => prev.map((item, idx) => {
      if (!applyToAll && idx !== currentIndex) return item;
      return {
        ...item,
        settings: cloneSettings(nextSettings),
        advanced: cloneAdvanced(nextAdvanced),
        history: [{ settings: cloneSettings(nextSettings), advanced: cloneAdvanced(nextAdvanced) }],
        historyIndex: 0
      };
    }));
    setAiExplanation(data.explanation);
  };

  const handleAiMagic = async () => {
    if (!apiKey.trim()) {
      setAiError("請先輸入你的 Gemini API Key！");
      return;
    }
    if (!currentImageObj) {
      setAiError("請先上傳要調整的目標圖片！");
      return;
    }

    if (!aiPrompt.trim() && !refImageObj) {
      setAiError("請輸入風格描述，或上傳一張參考圖片。");
      return;
    }

    setIsAiLoading(true);
    setAiError("");
    setAiExplanation("");

    try {
      const base64TargetImage = getResizedBase64(currentImageObj);

      let promptParts = [];

      if (refImageObj) {
        const base64RefImage = getResizedBase64(refImageObj);
        promptParts.push({ text: "Image 1 (Reference Style):" });
        promptParts.push({ inlineData: { mimeType: "image/jpeg", data: base64RefImage } });
        promptParts.push({ text: "Image 2 (Target Image to adjust):" });
        promptParts.push({ inlineData: { mimeType: "image/jpeg", data: base64TargetImage } });

        let instruction = "You are an expert image colorist. Analyze the color grading, overall tone, contrast, and atmosphere of Image 1 (Reference). Then, provide the optimal JSON parameters to adjust Image 2 so its color style matches Image 1 as closely as possible.";
        if (aiPrompt.trim()) {
          instruction += ` Additionally, take this user request into account: \"${aiPrompt}\".`;
        }
        promptParts.push({ text: instruction });
      } else {
        promptParts.push({ text: `You are an expert image colorist. Analyze this image and apply the requested style: \"${aiPrompt}\". Provide the optimal JSON parameters for the web-based adjustment tool.` });
        promptParts.push({ inlineData: { mimeType: "image/jpeg", data: base64TargetImage } });
      }

      const payload = {
        contents: [
          {
            role: "user",
            parts: promptParts
          }
        ],
        systemInstruction: {
          parts: [{
            text: `You are a professional cinematic colorist. Output strictly as JSON matching the schema.
            Tool parameters mapping:
            - brightness (0-200, default 100)
            - saturation (0-200, default 100)
            - contrast (0-200, default 100)
            - globalHue (-180 to 180, default 0)
            - shadows (-100 to 100, 0 is neutral): Adjust dark areas.
            - highlights (-100 to 100, 0 is neutral): Adjust bright areas.
            - temperature (-100 to 100, 0 is neutral): Negative is Blue (Cool), Positive is Yellow (Warm).
            - tint (-100 to 100, 0 is neutral): Negative is Green, Positive is Magenta.
            - advanced: for specific color replacement.
              - enabled (boolean)
              - targetHue (0-360, e.g., Red=0, Yellow=60, Green=120, Cyan=180, Blue=240, Magenta=300)
              - tolerance (5-90, default 30)
              - hueShift (-180 to 180)
              - satShift (-100 to 100)`
          }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              settings: {
                type: "OBJECT",
                properties: {
                  brightness: { type: "NUMBER" },
                  saturation: { type: "NUMBER" },
                  contrast: { type: "NUMBER" },
                  globalHue: { type: "NUMBER" },
                  shadows: { type: "NUMBER" },
                  highlights: { type: "NUMBER" },
                  temperature: { type: "NUMBER" },
                  tint: { type: "NUMBER" }
                }
              },
              advanced: {
                type: "OBJECT",
                properties: {
                  enabled: { type: "BOOLEAN" },
                  targetHue: { type: "NUMBER" },
                  tolerance: { type: "NUMBER" },
                  hueShift: { type: "NUMBER" },
                  satShift: { type: "NUMBER" }
                }
              },
              explanation: { type: "STRING", description: "Explain in Traditional Chinese why these settings match the user's prompt or the reference image style." }
            }
          }
        }
      };

      let retries = 5;
      let delay = 1000;
      let data = null;

      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error(`API 錯誤: ${res.status}`);
          const rawResponse = await res.json();
          const rawText = rawResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            throw new Error('AI 回傳格式不正確');
          }
          try {
            data = JSON.parse(rawText);
          } catch (parseError) {
            console.error('Failed to parse AI response', rawText);
            throw new Error('AI 回傳不是有效的 JSON');
          }
          break;
        } catch (err) {
          if (i === retries) throw err;
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }

      if (data) {
        applyAiResult(data, applyAiToAll);
      }
    } catch (err) {
      console.error(err);
      setAiError("AI 處理失敗，請稍後再試。");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-screen theme-dark text-slate-900 font-sans flex flex-col overflow-hidden">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
            <Palette className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">Color Control</h1>
            <p className="text-xs text-slate-400 font-semibold">多圖調色與 AI 參考風格</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
          >
            LiteLab
          </Link>
          <label className="cursor-pointer bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-100 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-slate-600">
            <Upload size={16} />
            多圖上傳
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (!e.target.files?.length) return;
                handleImagesUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {imageList.length > 0 && (
            <button
              onClick={handleBatchDownload}
              disabled={isBatchProcessing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-xl flex items-center gap-2"
            >
              {isBatchProcessing ? <RotateCcw className="animate-spin" size={16} /> : <FileArchive size={16} />}
              批次下載 ZIP ({imageList.length})
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">圖片 ({imageList.length})</span>
              {currentItem && (
                <div className="text-[11px] text-slate-400 font-semibold mt-1">
                  目前：{currentItem.name || `img_${currentIndex + 1}`} (#{currentIndex + 1})
                </div>
              )}
            </div>
            {imageList.length > 0 && (
              <button
                onClick={() => { setImageList([]); setCurrentIndex(-1); }}
                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                title="清空圖片"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {imageList.length === 0 ? (
              <div className="text-sm text-slate-400 font-semibold">尚未加入圖片</div>
            ) : (
              <div className="custom-scrollbar grid grid-cols-2 gap-3">
                {imageList.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentIndex === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={item.src} className="w-full h-full object-cover" alt={item.name || 'thumb'} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageAt(idx);
                      }}
                      className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500/80 transition"
                      title="移除圖片"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 right-0 bg-blue-600 text-[8px] text-white px-1 font-mono rounded-tl">#{idx + 1}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
          <div className="flex gap-4 p-6 pb-0">
            <button
              onClick={handleDownloadCurrent}
              disabled={!currentItem || isProcessing}
              className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${!currentItem
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                : isProcessing
                  ? 'bg-emerald-800 text-emerald-200 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                }`}
            >
              <Download className="w-5 h-5" />
              {isProcessing ? '輸出中...' : '下載目前圖片'}
            </button>
          </div>

          <div className="flex-1 relative flex items-start justify-center p-8 overflow-hidden min-h-0">
            {!currentItem ? (
              <div className="text-center w-full max-w-2xl mx-auto border-2 border-dashed rounded-3xl p-10 transition-all border-slate-200 bg-white/60">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                  <ImageIcon className="text-slate-400" size={32} />
                </div>
                <h2 className="text-lg font-black text-slate-800">等待圖片上傳...</h2>
                <p className="text-sm text-slate-500 font-semibold mt-2">請在上方點擊多圖上傳</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-start justify-center overflow-hidden bg-[#0F172A] rounded-[3rem] shadow-2xl border-[12px] border-white">
                {currentImageObj ? (
                  <div className="absolute inset-0 p-4 flex items-start justify-center">
                    <div
                      className="relative shadow-2xl rounded-lg overflow-hidden max-w-full max-h-full flex items-center justify-center"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, #404040 25%, transparent 25%, transparent 75%, #404040 75%, #404040), repeating-linear-gradient(45deg, #404040 25%, #262626 25%, #262626 75%, #404040 75%, #404040)',
                        backgroundPosition: '0 0, 10px 10px',
                        backgroundSize: '20px 20px'
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-[70vh] object-contain transition-opacity duration-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 flex flex-col items-center">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg text-neutral-400">載入圖片中...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-sm">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-2xl border border-indigo-500/30 shadow-lg shadow-purple-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-indigo-100">✨ AI 專業調色師</h2>
              </div>
              <p className="text-xs text-indigo-200/70 mb-4">輸入文字描述，或提供一張參考圖片，讓 AI 幫你找出最佳參數。</p>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-indigo-300">🔑 Gemini API Key</label>
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey("");
                      try {
                        localStorage.removeItem('gemini_api_key');
                      } catch (err) {
                        console.warn('Failed to clear Gemini API key', err);
                      }
                    }}
                    className="text-[11px] text-indigo-200/70 hover:text-red-300 transition-colors"
                  >
                    清除 Key
                  </button>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setApiKey(nextValue);
                    try {
                      localStorage.setItem('gemini_api_key', nextValue);
                    } catch (err) {
                      console.warn('Failed to save Gemini API key', err);
                    }
                  }}
                  placeholder="貼上你的 API Key（從 aistudio.google.com 取得）"
                  className="w-full bg-neutral-950/50 border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300/30 focus:outline-none focus:border-indigo-400"
                />
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <p className="text-indigo-300/50">Key 僅存於你的瀏覽器，不會上傳至任何伺服器。</p>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-300/70 hover:text-indigo-200 underline"
                  >
                    取得 API Key
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-neutral-950/40 border border-indigo-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-300 flex items-center gap-1">
                      <ImagePlus className="w-3.5 h-3.5" /> 參考風格圖片 (可選)
                    </span>
                    {refImageSrc && (
                      <button
                        onClick={() => setRefImageSrc(null)}
                        className="text-neutral-500 hover:text-red-400 transition-colors"
                        title="移除參考圖片"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {refImageSrc ? (
                    <div className="relative h-20 w-full rounded overflow-hidden border border-indigo-500/30">
                      <img src={refImageSrc} alt="Reference" className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white">將以此圖風格為基準</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => refFileInputRef.current?.click()}
                      className="w-full h-12 border border-dashed border-indigo-500/40 rounded flex items-center justify-center text-xs text-indigo-400/70 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
                    >
                      點擊上傳一張你喜歡的色調圖片
                    </button>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={refFileInputRef} onChange={(e) => {
                    if (!e.target.files?.length) return;
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => setRefImageSrc(event.target.result);
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                </div>

                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={refImageSrc ? "附加說明 (選填，如：稍微再亮一點)" : "例如：電影感賽博龐克、日系空氣感..."}
                  className="w-full bg-neutral-950/50 border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300/30 focus:outline-none focus:border-indigo-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleAiMagic()}
                />

                <label className="flex items-center gap-2 text-[11px] text-indigo-200/80">
                  <input
                    type="checkbox"
                    checked={applyAiToAll}
                    onChange={(e) => setApplyAiToAll(e.target.checked)}
                    className="accent-indigo-400"
                  />
                  套用到全部圖片
                </label>

                <button
                  onClick={handleAiMagic}
                  disabled={isAiLoading || !currentImageObj || (!aiPrompt.trim() && !refImageObj)}
                  className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isAiLoading || !currentImageObj || (!aiPrompt.trim() && !refImageObj)
                    ? 'bg-indigo-900/40 text-indigo-400/50 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 hover:shadow-indigo-500/20'
                    }`}
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isAiLoading ? 'Gemini 正在分析並計算參數...' : (refImageObj ? '✨ 匹配參考圖風格' : '✨ 魔術調色')}
                </button>
              </div>

              {aiError && <p className="text-red-400 text-xs mt-3">{aiError}</p>}
              {aiExplanation && (
                <div className="mt-4 p-3 bg-black/30 rounded-lg border border-indigo-500/20">
                  <p className="text-xs text-indigo-200 leading-relaxed"><span className="font-bold text-indigo-400">AI 解釋：</span>{aiExplanation}</p>
                </div>
              )}
            </div>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 text-neutral-100">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold">全域色彩調整</h2>
              </div>
              <div className="space-y-4">
                <SliderControl label="明度 (Brightness)" value={currentSettings.brightness} min={0} max={200} onChange={(v) => updateCurrentSettings({ brightness: v })} />
                <SliderControl label="對比 (Contrast)" value={currentSettings.contrast} min={0} max={200} onChange={(v) => updateCurrentSettings({ contrast: v })} />
                <SliderControl label="飽和度 (Saturation)" value={currentSettings.saturation} min={0} max={200} onChange={(v) => updateCurrentSettings({ saturation: v })} />
                <div className="h-px bg-neutral-800 my-2"></div>
                <SliderControl label="陰影 (Shadows)" value={currentSettings.shadows} min={-100} max={100} onChange={(v) => updateCurrentSettings({ shadows: v })} />
                <SliderControl label="高光 (Highlights)" value={currentSettings.highlights} min={-100} max={100} onChange={(v) => updateCurrentSettings({ highlights: v })} />
                <SliderControl label="色溫 (Temperature)" value={currentSettings.temperature} min={-100} max={100} unit="°" onChange={(v) => updateCurrentSettings({ temperature: v })} />
                <SliderControl label="色調 (Tint)" value={currentSettings.tint} min={-100} max={100} unit="°" onChange={(v) => updateCurrentSettings({ tint: v })} />
              </div>
            </div>

            <div className="bg-neutral-900 p-6 rounded-2xl border border-purple-500/30 relative overflow-hidden text-neutral-100">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 opacity-50"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-purple-100">特定色彩獨立調整</h2>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={currentAdvanced.enabled} onChange={(e) => updateCurrentAdvanced({ enabled: e.target.checked })} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${currentAdvanced.enabled ? 'bg-purple-500' : 'bg-neutral-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${currentAdvanced.enabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className={`space-y-5 transition-opacity ${currentAdvanced.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-neutral-300">選取目標顏色 (色相)</label>
                    <span className="text-xs font-mono bg-neutral-900 px-2 py-1 rounded text-purple-400">{currentAdvanced.targetHue}°</span>
                  </div>
                  <input
                    type="range" min={0} max={360} value={currentAdvanced.targetHue}
                    onChange={(e) => updateCurrentAdvanced({ targetHue: Number(e.target.value) })}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer outline-none"
                    style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 px-1 mt-1">
                    <span>紅</span><span>黃</span><span>綠</span><span>青</span><span>藍</span><span>洋紅</span><span>紅</span>
                  </div>
                </div>

                <SliderControl label="影響範圍 (容差)" value={currentAdvanced.tolerance} min={5} max={90} unit="°" onChange={(v) => updateCurrentAdvanced({ tolerance: v })} />
                <div className="h-px bg-neutral-700 my-2"></div>
                <SliderControl label="抽色/目標彩度調整" value={currentAdvanced.satShift} min={-100} max={100} onChange={(v) => updateCurrentAdvanced({ satShift: v })} description="降至 -100 將該顏色變為灰階。" />
                <SliderControl label="替換為其他顏色 (偏移)" value={currentAdvanced.hueShift} min={-180} max={180} unit="°" onChange={(v) => updateCurrentAdvanced({ hueShift: v })} />
              </div>
            </div>

            <button
              onClick={applyCurrentToAll}
              disabled={!currentItem}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" /> 套用目前參數到全部圖片
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" /> 回復
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCw className="w-4 h-4" /> 重做
              </button>
            </div>

            <button
              onClick={handleResetCurrent}
              disabled={!currentItem}
              className="w-full flex items-center justify-center gap-2 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" /> 恢復目前圖片初始值
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ColorControl;

function SliderControl({ label, value, min, max, onChange, unit = "%", description }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-neutral-300">{label}</label>
        <span className="text-xs font-mono bg-neutral-900 px-2 py-1 rounded text-blue-400">
          {value > 0 && (min < 0) ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      {description && <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{description}</p>}
    </div>
  );
}
