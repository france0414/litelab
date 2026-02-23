import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, Download, Maximize, RotateCcw, ImageIcon, Move,
  AlignCenter, Gauge, ArrowLeftRight, ArrowUpDown,
  HardDrive, Trash2, ChevronLeft, ChevronRight, Copy, FileArchive
} from 'lucide-react';

let jsZipLoadPromise = null;

const Cropper = () => {
  const MAX_IMAGES = 30;
  // 核心狀態 (多圖隊列)
  const [imageList, setImageList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 共用規格
  const [aspect, setAspect] = useState(4 / 3);
  const [customWidth, setCustomWidth] = useState(1000);
  const [customHeight, setCustomHeight] = useState(750);
  const [quality, setQuality] = useState(0.85); // 壓縮品質
  const [fileSize, setFileSize] = useState(null); // 當前圖片預估體積
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSingleExporting, setIsSingleExporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('4:3');
  const [lastFitMode, setLastFitMode] = useState(null);
  const [step, setStep] = useState('crop');
  const [bgColorInput, setBgColorInput] = useState('#ffffff');
  const [outputFormat, setOutputFormat] = useState('jpeg');

  // 互動狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const currentItem = imageList[currentIndex] || null;
  const isPreCroppedItem = !!currentItem?.isPreCropped;
  const effectiveStep = isPreCroppedItem ? 'postprocess' : step;
  const isPostProcess = effectiveStep === 'postprocess';
  const isStep1Locked = isPreCroppedItem || isPostProcess;
  const isPostprocessDisabled = !currentItem;
  const isPngOutput = outputFormat === 'png';
  const outputMime = isPngOutput ? 'image/png' : 'image/jpeg';
  const outputExt = isPngOutput ? 'png' : 'jpg';
  const isValidHexColor = (value) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
  const isTransparentColor = (value) => value?.toLowerCase() === 'transparent';
  const currentPostprocess = currentItem?.postprocess || {};
  const currentBgMode = currentPostprocess.bgMode || 'solid';
  const currentGradient = currentPostprocess.bgGradient || {};
  const gradientFromValue = isValidHexColor(currentGradient.from || '') ? currentGradient.from : '#ffffff';
  const gradientToValue = isValidHexColor(currentGradient.to || '') ? currentGradient.to : '#0f172a';
  const gradientAngleValue = Number.isFinite(currentGradient.angle) ? currentGradient.angle : 135;
  const gradientCxValue = Number.isFinite(currentGradient.cx) ? currentGradient.cx : 50;
  const gradientCyValue = Number.isFinite(currentGradient.cy) ? currentGradient.cy : 50;

  // 動態載入 JSZip
  const loadJSZip = () => {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (jsZipLoadPromise) return jsZipLoadPromise;
    jsZipLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        if (window.JSZip) {
          resolve(window.JSZip);
          return;
        }
        jsZipLoadPromise = null;
        reject(new Error('JSZip failed to initialize.'));
      };
      script.onerror = () => {
        jsZipLoadPromise = null;
        reject(new Error('JSZip failed to load.'));
      };
      document.head.appendChild(script);
    });
    return jsZipLoadPromise;
  };

  // 1. 檔案處理邏輯
  const handleImagesUpload = (files) => {
    const remaining = Math.max(0, MAX_IMAGES - imageList.length);
    if (remaining === 0) {
      window.alert(`單次最多可加入 ${MAX_IMAGES} 張圖片，請先清空或下載後再上傳。`);
      return;
    }

    const allFiles = Array.from(files);
    const filesToAdd = allFiles.slice(0, remaining);
    if (filesToAdd.length < allFiles.length) {
      window.alert(`已超過上限，僅加入前 ${remaining} 張圖片。`);
    }

    filesToAdd.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result;
          const img = new Image();
          img.onload = () => {
            const newItem = {
              id: Date.now() + Math.random(),
              src,
              name: file.name.split('.')[0],
              crop: { x: 0, y: 0 },
              zoom: 1,
                postprocess: {
                  outerRadius: 0,
                  innerRadius: 0,
                  padding: 0,
                  bgColor: '#ffffff',
                  bgMode: 'solid',
                  bgGradient: {
                    type: 'linear',
                    from: '#ffffff',
                    to: '#0f172a',
                    angle: 135,
                    cx: 50,
                    cy: 50
                  }
                },
              width: img.naturalWidth,
              height: img.naturalHeight,
              isPreCropped: false
            };
            setImageList(prev => {
              const updated = [...prev, newItem];
              if (prev.length === 0 && index === 0) setCurrentIndex(0);
              return updated;
            });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handlePreCroppedUpload = (files) => {
    const remaining = Math.max(0, MAX_IMAGES - imageList.length);
    if (remaining === 0) {
      window.alert(`單次最多可加入 ${MAX_IMAGES} 張圖片，請先清空或下載後再上傳。`);
      return;
    }

    const allFiles = Array.from(files);
    const filesToAdd = allFiles.slice(0, remaining);
    if (filesToAdd.length < allFiles.length) {
      window.alert(`已超過上限，僅加入前 ${remaining} 張圖片。`);
    }

    filesToAdd.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result;
          const img = new Image();
          img.onload = () => {
            const newItem = {
              id: Date.now() + Math.random(),
              src,
              name: file.name.split('.')[0],
              crop: { x: 0, y: 0 },
              zoom: 1,
                postprocess: {
                  outerRadius: 0,
                  innerRadius: 0,
                  padding: 0,
                  bgColor: '#ffffff',
                  bgMode: 'solid',
                  bgGradient: {
                    type: 'linear',
                    from: '#ffffff',
                    to: '#0f172a',
                    angle: 135,
                    cx: 50,
                    cy: 50
                  }
                },
              width: img.naturalWidth,
              height: img.naturalHeight,
              isPreCropped: true
            };
            setImageList(prev => {
              const updated = [...prev, newItem];
              if (prev.length === 0 && index === 0) setCurrentIndex(0);
              return updated;
            });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const onFileChange = (e) => handleImagesUpload(e.target.files);

  // 2. 即時預估體積 (Debounced)
  const estimateSize = useCallback(() => {
    if (!currentItem || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    canvas.width = customWidth;
    canvas.height = customHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (isPostProcess || currentItem.isPreCropped) {
      renderPostprocessToCanvas(ctx, img, currentItem, customWidth, customHeight, outputFormat);
    } else {
      const previewRefSize = 680;
      const scale = customWidth / (aspect >= 1 ? previewRefSize : previewRefSize * aspect);

      const dw = img.naturalWidth * currentItem.zoom * scale;
      const dh = img.naturalHeight * currentItem.zoom * scale;
      const dx = (customWidth / 2) + (currentItem.crop.x * scale) - (dw / 2);
      const dy = (customHeight / 2) + (currentItem.crop.y * scale) - (dh / 2);

      if (!isPngOutput) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        setFileSize((blob.size / 1024).toFixed(1));
      }
    }, outputMime, isPngOutput ? undefined : quality);
  }, [currentItem, aspect, customWidth, customHeight, quality, isPostProcess, outputMime, isPngOutput, outputFormat]);

  useEffect(() => {
    const timer = setTimeout(estimateSize, 500);
    return () => clearTimeout(timer);
  }, [estimateSize]);

  useEffect(() => {
    if (currentItem?.isPreCropped && step !== 'postprocess') {
      setStep('postprocess');
    }
  }, [currentItem?.isPreCropped, step]);

  useEffect(() => {
    setBgColorInput(currentItem?.postprocess?.bgColor || '#ffffff');
  }, [currentItem?.postprocess?.bgColor, currentIndex]);

  // 3. 更新當前圖片狀態
  const updateCurrentItem = (updates) => {
    setImageList(prev => prev.map((item, idx) =>
      idx === currentIndex ? { ...item, ...updates } : item
    ));
  };

  const applyCurrentSettingsToAll = () => {
    if (!currentItem || isStep1Locked) return;
    const { crop, zoom } = currentItem;
    const frameRect = containerRef.current?.getBoundingClientRect();

    setImageList(prev => prev.map(item => {
      if (!lastFitMode || !frameRect || !item.width || !item.height) {
        return { ...item, crop: { ...crop }, zoom };
      }

      const fittedZoom = lastFitMode === 'width'
        ? frameRect.width / item.width
        : frameRect.height / item.height;

      const scale = zoom ? fittedZoom / zoom : 1;
      return {
        ...item,
        zoom: Math.min(Math.max(fittedZoom, 0.01), 10),
        crop: {
          x: crop.x * scale,
          y: crop.y * scale
        }
      };
    }));
  };

  const applyCurrentPostprocessToAll = () => {
    if (!currentItem) return;
    const { postprocess } = currentItem;
    setImageList(prev => prev.map(item => ({
      ...item,
      postprocess: { ...postprocess }
    })));
  };

  // 4. 解析度微調
  const presetRatios = {
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9
  };

  const handleSizeInput = (type, val) => {
    const value = Math.max(1, parseInt(val) || 0);
    const ratio = presetRatios[selectedPreset];
    if (ratio) {
      if (type === 'width') {
        const nextHeight = Math.max(1, Math.round(value / ratio));
        setCustomWidth(value);
        setCustomHeight(nextHeight);
        setAspect(ratio);
      } else {
        const nextWidth = Math.max(1, Math.round(value * ratio));
        setCustomHeight(value);
        setCustomWidth(nextWidth);
        setAspect(ratio);
      }
      return;
    }

    if (type === 'width') {
      setCustomWidth(value);
      setAspect(value / customHeight);
    } else {
      setCustomHeight(value);
      setAspect(customWidth / value);
    }
  };

  const handlePreset = (presetId, w, h) => {
    setSelectedPreset(presetId);
    setCustomWidth(w);
    setCustomHeight(h);
    setAspect(w / h);
  };

  const fitImageToFrame = (mode) => {
    if (!currentItem || !imageRef.current || !containerRef.current) return;
    const frameRect = containerRef.current.getBoundingClientRect();
    const img = imageRef.current;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    if (!imgWidth || !imgHeight || !frameRect.width || !frameRect.height) return;

    const nextZoom = mode === 'width'
      ? frameRect.width / imgWidth
      : frameRect.height / imgHeight;

    updateCurrentItem({
      zoom: Math.min(Math.max(nextZoom, 0.01), 10),
      crop: { x: 0, y: 0 }
    });
    setLastFitMode(mode);
  };

  // 5. 渲染與導出
  const drawRoundedRectPath = (ctx, x, y, width, height, radius) => {
    if (width <= 0 || height <= 0) return;
    const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    if (safeRadius === 0) {
      ctx.rect(x, y, width, height);
      return;
    }
    const right = x + width;
    const bottom = y + height;
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(right - safeRadius, y);
    ctx.arcTo(right, y, right, y + safeRadius, safeRadius);
    ctx.lineTo(right, bottom - safeRadius);
    ctx.arcTo(right, bottom, right - safeRadius, bottom, safeRadius);
    ctx.lineTo(x + safeRadius, bottom);
    ctx.arcTo(x, bottom, x, bottom - safeRadius, safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.arcTo(x, y, x + safeRadius, y, safeRadius);
  };

  const renderPostprocessToCanvas = (ctx, img, item, targetWidth, targetHeight, format = 'jpeg') => {
    const previewRefSize = 680;
    const postprocess = item?.postprocess || {};
    const rawBgColor = postprocess.bgColor || '';
    const isTransparentBg = isTransparentColor(rawBgColor);
    const resolvedBgColor = isTransparentBg
      ? '#ffffff'
      : (isValidHexColor(rawBgColor) ? rawBgColor : '#ffffff');
    const bgMode = postprocess.bgMode || 'solid';
    const gradientConfig = postprocess.bgGradient || {};
    const gradientType = gradientConfig.type || 'linear';
    const gradientFrom = isValidHexColor(gradientConfig.from || '') ? gradientConfig.from : '#ffffff';
    const gradientTo = isValidHexColor(gradientConfig.to || '') ? gradientConfig.to : '#0f172a';
    const gradientAngle = Number.isFinite(gradientConfig.angle) ? gradientConfig.angle : 135;
    const gradientCx = Number.isFinite(gradientConfig.cx) ? Math.max(0, Math.min(100, gradientConfig.cx)) : 50;
    const gradientCy = Number.isFinite(gradientConfig.cy) ? Math.max(0, Math.min(100, gradientConfig.cy)) : 50;

    const maxPadding = Math.min(targetWidth, targetHeight) / 2;
    const padding = Math.max(0, Math.min(postprocess.padding || 0, maxPadding));
    const innerWidth = Math.max(0, targetWidth - padding * 2);
    const innerHeight = Math.max(0, targetHeight - padding * 2);

    const outerRadius = Math.max(0, Math.min(postprocess.outerRadius || 0, Math.min(targetWidth, targetHeight) / 2));
    const innerRadius = Math.max(0, Math.min(postprocess.innerRadius || 0, Math.min(innerWidth, innerHeight) / 2));

    ctx.save();
    ctx.beginPath();
    drawRoundedRectPath(ctx, 0, 0, targetWidth, targetHeight, outerRadius);
    ctx.clip();

    if (bgMode === 'solid') {
      if (!(isTransparentBg && format === 'png')) {
        ctx.fillStyle = resolvedBgColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }
    } else if (bgMode === 'linear') {
      const rad = (gradientAngle % 360) * (Math.PI / 180);
      const halfW = targetWidth / 2;
      const halfH = targetHeight / 2;
      const x0 = halfW - Math.cos(rad) * halfW;
      const y0 = halfH - Math.sin(rad) * halfH;
      const x1 = halfW + Math.cos(rad) * halfW;
      const y1 = halfH + Math.sin(rad) * halfH;
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, gradientFrom);
      gradient.addColorStop(1, gradientTo);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else if (bgMode === 'radial') {
      const centerX = (gradientCx / 100) * targetWidth;
      const centerY = (gradientCy / 100) * targetHeight;
      const radius = Math.max(targetWidth, targetHeight) / 2;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, gradientFrom);
      gradient.addColorStop(1, gradientTo);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    if (innerWidth > 0 && innerHeight > 0) {
      const innerX = padding;
      const innerY = padding;

      ctx.save();
      ctx.beginPath();
      drawRoundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius);
      ctx.clip();

      if (item.isPreCropped) {
        const imageAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = innerWidth / innerHeight;
        let drawWidth = innerWidth;
        let drawHeight = innerHeight;
        let dx = innerX;
        let dy = innerY;

        if (Number.isFinite(imageAspect) && imageAspect > 0) {
          if (imageAspect > targetAspect) {
            drawWidth = innerWidth;
            drawHeight = innerWidth / imageAspect;
            dy = innerY + (innerHeight - drawHeight) / 2;
          } else if (imageAspect < targetAspect) {
            drawHeight = innerHeight;
            drawWidth = innerHeight * imageAspect;
            dx = innerX + (innerWidth - drawWidth) / 2;
          }
        }

        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      } else {
        const innerAspect = innerWidth / innerHeight;
        const scale = innerWidth / (innerAspect >= 1 ? previewRefSize : previewRefSize * innerAspect);

        const dw = img.naturalWidth * item.zoom * scale;
        const dh = img.naturalHeight * item.zoom * scale;
        const dx = innerX + (innerWidth / 2) + (item.crop.x * scale) - (dw / 2);
        const dy = innerY + (innerHeight / 2) + (item.crop.y * scale) - (dh / 2);

        ctx.drawImage(img, dx, dy, dw, dh);
      }

      ctx.restore();
    }

    ctx.restore();
  };
  const renderToCanvasForZip = (item, targetWidth, targetHeight, targetQuality, renderStep, format) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (renderStep === 'postprocess' || item.isPreCropped) {
          renderPostprocessToCanvas(ctx, img, item, targetWidth, targetHeight, format);
        } else {
          const previewRefSize = 680;
          const scale = targetWidth / (targetWidth / targetHeight >= 1 ? previewRefSize : previewRefSize * (targetWidth / targetHeight));

          const dw = img.naturalWidth * item.zoom * scale;
          const dh = img.naturalHeight * item.zoom * scale;
          const dx = (targetWidth / 2) + (item.crop.x * scale) - (dw / 2);
          const dy = (targetHeight / 2) + (item.crop.y * scale) - (dh / 2);

          if (format !== 'png') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, dx, dy, dw, dh);
        }
        if (format === 'png') {
          resolve(canvas.toDataURL('image/png').split(',')[1]);
          return;
        }
        resolve(canvas.toDataURL('image/jpeg', targetQuality).split(',')[1]);
      };
      img.src = item.src;
    });
  };

  const renderToCanvasDataUrl = (item, targetWidth, targetHeight, targetQuality, format) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (isPostProcess || item.isPreCropped) {
          renderPostprocessToCanvas(ctx, img, item, targetWidth, targetHeight, format);
        } else {
          const previewRefSize = 680;
          const scale = targetWidth / (targetWidth / targetHeight >= 1 ? previewRefSize : previewRefSize * (targetWidth / targetHeight));

          const dw = img.naturalWidth * item.zoom * scale;
          const dh = img.naturalHeight * item.zoom * scale;
          const dx = (targetWidth / 2) + (item.crop.x * scale) - (dw / 2);
          const dy = (targetHeight / 2) + (item.crop.y * scale) - (dh / 2);

          if (format !== 'png') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, dx, dy, dw, dh);
        }
        if (format === 'png') {
          resolve(canvas.toDataURL('image/png'));
          return;
        }
        resolve(canvas.toDataURL('image/jpeg', targetQuality));
      };
      img.src = item.src;
    });
  };

  useEffect(() => {
    if (!isPostProcess) return;
    if (!currentItem || !containerRef.current || !imageRef.current || !previewCanvasRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const previewScale = customWidth ? rect.width / customWidth : 1;
    const previewItem = {
      ...currentItem,
      postprocess: {
        ...(currentItem.postprocess || {}),
        padding: (currentItem.postprocess?.padding || 0) * previewScale,
        outerRadius: (currentItem.postprocess?.outerRadius || 0) * previewScale,
        innerRadius: (currentItem.postprocess?.innerRadius || 0) * previewScale
      }
    };

    renderPostprocessToCanvas(ctx, imageRef.current, previewItem, rect.width, rect.height, outputFormat);
  }, [currentItem, isPostProcess, aspect, customWidth, customHeight, outputFormat]);

  const batchDownloadZip = async () => {
    if (imageList.length === 0) return;
    const exportStep = isPostProcess ? 'postprocess' : 'crop';
    setIsProcessing(true);
    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();
      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const base64Data = await renderToCanvasForZip(item, customWidth, customHeight, quality, exportStep, outputFormat);
        zip.file(`${item.name || `img_${i + 1}`}.${outputExt}`, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      const url = URL.createObjectURL(content);
      link.href = url;
      link.download = `batch_export_${new Date().getTime()}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (e) {
      console.error(e);
      window.alert('壓縮模組載入失敗，請稍後再試。');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCurrentImage = async () => {
    if (!currentItem) return;
    setIsSingleExporting(true);
    try {
      const dataUrl = await renderToCanvasDataUrl(currentItem, customWidth, customHeight, quality, outputFormat);
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const baseName = currentItem.name || `img_${currentIndex + 1}`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${baseName}_crop_${stamp}.${outputExt}`;
      link.click();
    } catch (e) { console.error(e); } finally { setIsSingleExporting(false); }
  };

  // 互動事件
  const onMouseDown = (e) => {
    if (!currentItem || isStep1Locked) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - currentItem.crop.x, y: e.clientY - currentItem.crop.y });
  };
  const onMouseMove = (e) => {
    if (isStep1Locked) return;
    if (isDragging) {
      setLastFitMode(null);
      updateCurrentItem({ crop: { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y } });
    }
  };

  return (
    <div className="h-screen theme-dark text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* 導覽列 */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
            <FileArchive className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">批次精準裁切 <span className="text-blue-600 uppercase text-sm ml-1 tracking-widest">Plus</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
          >
            LiteLab
          </Link>
          <label className="cursor-pointer bg-slate-700 hover:bg-teal-500 hover:text-white hover:border-teal-400 text-slate-100 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-slate-600">
            <Upload size={16} />
            批次加入圖片
            <input type="file" className="hidden" accept="image/*" multiple onChange={onFileChange} />
          </label>
          <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-blue-200">
            <Upload size={16} />
            匯入已裁切圖片（Step 2）
            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePreCroppedUpload(e.target.files)} />
          </label>
          {imageList.length > 0 && (
            <button
              onClick={batchDownloadZip}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-xl flex items-center gap-2"
            >
              {isProcessing ? <RotateCcw className="animate-spin" size={16} /> : <FileArchive size={16} />}
              打包下載 ZIP ({imageList.length})
            </button>
          )}
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* 左側縮圖列 */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">隊列圖片 ({imageList.length})</span>
            {imageList.length > 0 && (
              <button onClick={() => { setImageList([]); setCurrentIndex(-1); }} className="text-slate-300 hover:text-rose-500 transition-colors p-1" title="清空隊列">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {imageList.length === 0 ? (
              <div className="text-sm text-slate-400 font-semibold">尚未加入圖片，請從右上角批次加入</div>
            ) : (
              <div className="custom-scrollbar grid grid-cols-2 gap-3">
                {imageList.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentIndex === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={item.src} className="w-full h-full object-cover" alt="thumb" />
                    <div className="absolute bottom-0 right-0 bg-blue-600 text-[8px] text-white px-1 font-mono rounded-tl">#{idx + 1}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* 中間作業區 */}
        <main className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden min-h-0">
            {!currentItem ? (
              <div
                className={`text-center w-full max-w-2xl mx-auto border-2 border-dashed rounded-3xl p-10 transition-all ${isDragOver ? 'border-blue-600 bg-blue-50/70' : 'border-slate-200 bg-white/60'}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer?.files?.length) handleImagesUpload(e.dataTransfer.files);
                }}
              >
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                  <ImageIcon className="text-slate-400" size={32} />
                </div>
                <h2 className="text-lg font-black text-slate-800">等待圖片上傳...</h2>
                <p className="text-sm text-slate-500 font-semibold mt-2">拖放圖片到此區，或點擊按鈕選擇檔案</p>
                <label className="inline-flex items-center justify-center gap-2 mt-5 px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-md hover:bg-blue-700 transition-all cursor-pointer">
                  <Upload size={16} /> 上傳圖片
                  <input type="file" className="hidden" accept="image/*" multiple onChange={onFileChange} />
                </label>
              </div>
            ) : (
              <div
                className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move touch-none bg-[#0F172A] rounded-[3rem] shadow-2xl border-[12px] border-white"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onWheel={(e) => {
                  e.preventDefault();
                  if (isStep1Locked) return;
                  const delta = e.deltaY * -0.0012;
                  setLastFitMode(null);
                  updateCurrentItem({ zoom: Math.min(Math.max(currentItem.zoom + delta, 0.01), 10) });
                }}
              >
                <div
                  ref={containerRef}
                  className="relative z-20 pointer-events-none border border-white/30 shadow-[0_0_0_9999px_rgba(15,23,42,0.9)]"
                  style={{
                    aspectRatio: aspect,
                    width: aspect >= 1 ? 'min(92%, 680px)' : 'auto',
                    height: aspect < 1 ? 'min(92%, 680px)' : 'auto',
                  }}
                >
                  {isPostProcess && (
                    <canvas ref={previewCanvasRef} className="absolute inset-0" />
                  )}
                  {!isPostProcess && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                      {[...Array(9)].map((_, i) => <div key={i} className="border-[0.5px] border-white/30"></div>)}
                    </div>
                  )}
                </div>

                <img
                  ref={imageRef}
                  src={currentItem.src}
                  alt="Target"
                  draggable="false"
                  className="crop-image absolute max-w-none select-none"
                  style={{
                    transform: `translate(${currentItem.crop.x}px, ${currentItem.crop.y}px) scale(${currentItem.zoom})`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    opacity: isPostProcess ? 0 : 1,
                    pointerEvents: isPostProcess ? 'none' : 'auto'
                  }}
                />
              </div>
            )}

            {imageList.length > 1 && (
              <>
                <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} className="absolute left-4 z-30 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white shadow-lg"><ChevronLeft size={24} /></button>
                <button onClick={() => setCurrentIndex(prev => Math.min(imageList.length - 1, prev + 1))} className="absolute right-4 z-30 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white shadow-lg"><ChevronRight size={24} /></button>
              </>
            )}
          </div>

          {/* 底部微調列 */}
          <div className="bg-white border-t border-slate-200 p-6 flex items-center justify-between shrink-0 shadow-2xl">
            {!isPostProcess && (
              <div className="flex-1 max-w-lg space-y-1">
                <div className="flex justify-between items-center text-sm font-black text-slate-400 uppercase tracking-tighter">
                  <span className="flex items-center gap-1 italic">當前縮放百分比</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={currentItem ? Math.round(currentItem.zoom * 100) : 100}
                      onChange={(e) => {
                        setLastFitMode(null);
                        updateCurrentItem({ zoom: (parseInt(e.target.value) || 1) / 100 });
                      }}
                      disabled={!currentItem || isStep1Locked}
                      className="w-14 text-blue-600 bg-blue-50 rounded-md text-center font-black outline-none border border-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range" min="0.01" max="5" step="0.01"
                  value={currentItem ? currentItem.zoom : 1}
                  onChange={(e) => {
                    setLastFitMode(null);
                    updateCurrentItem({ zoom: parseFloat(e.target.value) });
                  }}
                  disabled={!currentItem || isStep1Locked}
                  className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            )}

            <div className="flex items-center gap-4 ml-8">
              <button
                onClick={downloadCurrentImage}
                disabled={!currentItem || isSingleExporting}
                className="px-4 py-2 rounded-xl text-sm font-black bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow"
              >
                {isSingleExporting ? <RotateCcw className="animate-spin" size={16} /> : <Download size={16} />}
                下載目前圖片
              </button>
              <div className="text-right">
                <span className="text-sm font-black text-slate-400 block uppercase">解析度</span>
                <span className="text-sm font-black text-slate-800">{customWidth} x {customHeight} px</span>
              </div>
              <div className="text-right border-l border-slate-100 pl-4">
                <span className="text-sm font-black text-slate-400 block uppercase">當前預估體積</span>
                <span className="text-sm font-black text-blue-600">{fileSize || '--'} KB</span>
              </div>
            </div>
          </div>
        </main>

        {/* 右側設定區 */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-sm">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep('crop')}
                  aria-pressed={!isPostProcess}
                  disabled={isPreCroppedItem}
                  className={`py-2 rounded-xl text-sm font-black transition-all ${!isPostProcess ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'} ${isPreCroppedItem ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Step 1: Crop
                </button>
                <button
                  onClick={() => setStep('postprocess')}
                  aria-pressed={isPostProcess}
                  disabled={isPostprocessDisabled}
                  className={`py-2 rounded-xl text-sm font-black transition-all ${isPostProcess ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'} ${isPostprocessDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Step 2: Postprocess
                </button>
              </div>
              <div className="text-xs text-slate-400 font-semibold px-1 pt-2">
                Step 1 調整裁切與縮放；Step 2 加背景、圓角與留白後輸出
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">輸出格式</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOutputFormat('jpeg')}
                  className={`py-2 rounded-xl text-sm font-black transition-all ${!isPngOutput ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                >
                  JPG
                </button>
                <button
                  onClick={() => setOutputFormat('png')}
                  className={`py-2 rounded-xl text-sm font-black transition-all ${isPngOutput ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                >
                  PNG 透明
                </button>
              </div>
              <div className="text-xs text-slate-400 font-semibold">
                PNG 會保留圓角外圍透明，背景色仍會顯示
              </div>
            </div>

            {!isPostProcess && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Maximize size={14} className="text-blue-500" /> 1. 解析度規格
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ n: '自訂' },
                      { n: '1:1', w: 1000, h: 1000 },
                      { n: '4:3', w: 1000, h: 750 },
                      { n: '16:9', w: 1600, h: 900 }
                    ].map(p => (
                      <button
                        key={p.n}
                        onClick={() => p.n === '自訂' ? setSelectedPreset('custom') : handlePreset(p.n, p.w, p.h)}
                        className={`py-1.5 rounded-lg border text-sm font-bold ${selectedPreset === p.n || (p.n === '自訂' && selectedPreset === 'custom') ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-100'}`}
                      >
                        {p.n}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input type="number" value={customWidth} onChange={(e) => handleSizeInput('width', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                      <span className="text-sm text-slate-400 block text-center mt-1">寬度</span>
                    </div>
                    <div className="flex-1">
                      <input type="number" value={customHeight} onChange={(e) => handleSizeInput('height', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                      <span className="text-sm text-slate-400 block text-center mt-1">高度</span>
                    </div>
                  </div>
                </div>

                {/* 影像對齊與同步 */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Move size={14} className="text-blue-500" /> 2. 影像對齊
                  </h3>
                  <button
                    onClick={() => updateCurrentItem({ crop: { x: 0, y: 0 } })}
                    className="w-full py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <AlignCenter size={16} /> 垂直水平置中
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fitImageToFrame('width')}
                      className="w-full py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      <ArrowLeftRight size={16} /> 寬度貼合
                    </button>
                    <button
                      onClick={() => fitImageToFrame('height')}
                      className="w-full py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      <ArrowUpDown size={16} /> 高度貼合
                    </button>
                  </div>
                  <button
                    onClick={applyCurrentSettingsToAll}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#5b3671] text-white hover:bg-[#6a3f84] rounded-2xl text-sm font-black transition-all shadow-md"
                  >
                    <Copy size={16} /> 同步當前設定至全部
                  </button>
                  <div className="text-sm text-slate-400 font-semibold">
                    解析度與品質為全域設定，已套用全部圖片
                  </div>
                </div>

                {/* 品質與體積 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Gauge size={14} /> 3. 壓縮品質與體積
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-600">導出品質</span>
                      <span className="text-sm font-black text-blue-600">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range" min="0.1" max="1.0" step="0.01" value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />

                    <div className="bg-white p-3 rounded-xl flex items-center justify-between border border-slate-200">
                      <div className="flex items-center gap-2 text-slate-400">
                        <HardDrive size={14} />
                        <span className="text-sm font-black uppercase">預估體積</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-800 font-mono">{fileSize || '--'}</span>
                        <span className="ml-1 text-sm font-bold text-slate-400">KB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isPostProcess && (
              <div className="space-y-3">
                {isPreCroppedItem && (
                  <div className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    此圖片已裁切，已略過 Step 1，可直接調整後製效果與匯出。
                  </div>
                )}
                {isPostprocessDisabled && (
                  <div className="text-xs text-slate-400 font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2">
                    尚未選取圖片，請先從左側隊列點選
                  </div>
                )}
                <div className={`p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 ${isPostprocessDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Postprocess 設定</h3>
                  <div className="space-y-3">
                    <span className="text-sm font-bold text-slate-600">背景模式</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => updateCurrentItem({ postprocess: { ...currentPostprocess, bgMode: 'solid' } })}
                        className={`py-2 rounded-xl text-sm font-black transition-all ${currentBgMode === 'solid' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >
                        純色
                      </button>
                      <button
                        onClick={() => updateCurrentItem({ postprocess: { ...currentPostprocess, bgMode: 'linear', bgGradient: { ...currentGradient, type: 'linear' } } })}
                        className={`py-2 rounded-xl text-sm font-black transition-all ${currentBgMode === 'linear' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >
                        線性
                      </button>
                      <button
                        onClick={() => updateCurrentItem({ postprocess: { ...currentPostprocess, bgMode: 'radial', bgGradient: { ...currentGradient, type: 'radial' } } })}
                        className={`py-2 rounded-xl text-sm font-black transition-all ${currentBgMode === 'radial' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >
                        放射
                      </button>
                    </div>
                  </div>

                  {currentBgMode === 'solid' && (
                    <div className="space-y-2">
                      <span className="text-sm font-bold text-slate-600">背景顏色</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {['#ffffff', '#0f172a', '#f8fafc', '#f97316', '#22c55e', '#2563eb', '#e11d48', '#111827'].map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              setBgColorInput(color);
                              updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), bgColor: color } });
                            }}
                            className={`h-8 w-8 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${currentItem?.postprocess?.bgColor === color ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`set background ${color}`}
                            disabled={isPostprocessDisabled}
                          />
                        ))}
                        <button
                          onClick={() => {
                            setBgColorInput('transparent');
                            updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), bgColor: 'transparent' } });
                          }}
                          className={`h-8 w-8 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isTransparentColor(currentItem?.postprocess?.bgColor || '') ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'}`}
                          style={{ backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}
                          aria-label="set background transparent"
                          disabled={isPostprocessDisabled}
                        />
                        <label className="h-8 w-8 rounded-lg border border-slate-200 overflow-hidden cursor-pointer disabled:cursor-not-allowed">
                          <input
                            type="color"
                            value={isValidHexColor(currentItem?.postprocess?.bgColor || '') ? (currentItem?.postprocess?.bgColor || '#ffffff') : '#ffffff'}
                            onChange={(e) => {
                              const nextColor = e.target.value.toLowerCase();
                              setBgColorInput(nextColor);
                              updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), bgColor: nextColor } });
                            }}
                            className="w-full h-full border-0 p-0 bg-transparent cursor-pointer"
                            disabled={isPostprocessDisabled}
                            aria-label="pick background color"
                          />
                        </label>
                        <input
                          type="text"
                          value={bgColorInput}
                          onChange={(e) => {
                            const nextValue = e.target.value.trim();
                            setBgColorInput(nextValue);
                            if (currentItem && (isValidHexColor(nextValue) || isTransparentColor(nextValue))) {
                              updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), bgColor: nextValue.toLowerCase() } });
                            }
                          }}
                          onBlur={() => {
                            if (!isValidHexColor(bgColorInput) && !isTransparentColor(bgColorInput)) {
                              setBgColorInput(currentItem?.postprocess?.bgColor || '#ffffff');
                            }
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder="#ffffff"
                          disabled={isPostprocessDisabled}
                        />
                      </div>
                    </div>
                  )}

                  {currentBgMode !== 'solid' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <span className="text-sm font-bold text-slate-600">漸層顏色</span>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-2">
                            <input
                              type="color"
                              value={gradientFromValue}
                              onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, from: e.target.value.toLowerCase() } } })}
                              className="h-8 w-10 border-0 p-0 bg-transparent cursor-pointer"
                              disabled={isPostprocessDisabled}
                              aria-label="gradient from color"
                            />
                            <span className="text-xs font-bold text-slate-500">起點</span>
                          </label>
                          <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-2">
                            <input
                              type="color"
                              value={gradientToValue}
                              onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, to: e.target.value.toLowerCase() } } })}
                              className="h-8 w-10 border-0 p-0 bg-transparent cursor-pointer"
                              disabled={isPostprocessDisabled}
                              aria-label="gradient to color"
                            />
                            <span className="text-xs font-bold text-slate-500">終點</span>
                          </label>
                        </div>
                      </div>

                      {currentBgMode === 'linear' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-600">角度</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="360"
                                value={Math.round(gradientAngleValue)}
                                onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, angle: Math.min(360, Math.max(0, parseInt(e.target.value) || 0)) } } })}
                                className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                disabled={isPostprocessDisabled}
                              />
                              <span className="text-xs text-slate-400">deg</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="1"
                            value={gradientAngleValue}
                            onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, angle: parseInt(e.target.value) } } })}
                            className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isPostprocessDisabled}
                          />
                        </div>
                      )}

                      {currentBgMode === 'radial' && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-slate-600">中心 X</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={Math.round(gradientCxValue)}
                                  onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, cx: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } } })}
                                  className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                  disabled={isPostprocessDisabled}
                                />
                                <span className="text-xs text-slate-400">%</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={gradientCxValue}
                              onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, cx: parseInt(e.target.value) } } })}
                              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isPostprocessDisabled}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-slate-600">中心 Y</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={Math.round(gradientCyValue)}
                                  onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, cy: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } } })}
                                  className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                  disabled={isPostprocessDisabled}
                                />
                                <span className="text-xs text-slate-400">%</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={gradientCyValue}
                              onChange={(e) => updateCurrentItem({ postprocess: { ...currentPostprocess, bgGradient: { ...currentGradient, cy: parseInt(e.target.value) } } })}
                              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isPostprocessDisabled}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-600">Padding</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={currentItem?.postprocess?.padding ?? 0}
                          onChange={(e) => updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), padding: Math.min(120, Math.max(0, parseInt(e.target.value) || 0)) } })}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={isPostprocessDisabled}
                        />
                        <span className="text-xs text-slate-400">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      step="1"
                      value={currentItem?.postprocess?.padding ?? 0}
                      onChange={(e) => updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), padding: parseInt(e.target.value) } })}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isPostprocessDisabled}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-600">Outer Radius</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={currentItem?.postprocess?.outerRadius ?? 0}
                          onChange={(e) => updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), outerRadius: Math.min(120, Math.max(0, parseInt(e.target.value) || 0)) } })}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={isPostprocessDisabled}
                        />
                        <span className="text-xs text-slate-400">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      step="1"
                      value={currentItem?.postprocess?.outerRadius ?? 0}
                      onChange={(e) => updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), outerRadius: parseInt(e.target.value) } })}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isPostprocessDisabled}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-600">Inner Radius</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={currentItem?.postprocess?.innerRadius ?? 0}
                          onChange={(e) => updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), innerRadius: Math.min(120, Math.max(0, parseInt(e.target.value) || 0)) } })}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={isPostprocessDisabled}
                        />
                        <span className="text-xs text-slate-400">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      step="1"
                      value={currentItem?.postprocess?.innerRadius ?? 0}
                      onChange={(e) => updateCurrentItem({ postprocess: { ...(currentItem?.postprocess || {}), innerRadius: parseInt(e.target.value) } })}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isPostprocessDisabled}
                    />
                  </div>

                  <button
                    onClick={applyCurrentPostprocessToAll}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black transition-all shadow-md disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
                    disabled={isPostprocessDisabled}
                  >
                    <Copy size={16} /> 套用目前設定至全部
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">正在壓縮打包所有圖片...</h2>
          <p className="text-slate-400 font-bold mt-2">正在處理中，請勿關閉視窗</p>
        </div>
      )}
    </div>
  );
};

export default Cropper;
