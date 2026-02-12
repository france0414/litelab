import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, Download, Maximize, RotateCcw, ImageIcon, Move,
  AlignCenter, Gauge, ArrowLeftRight, ArrowUpDown,
  HardDrive, Trash2, ChevronLeft, ChevronRight, Copy, FileArchive
} from 'lucide-react';

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

  // 互動狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const currentItem = imageList[currentIndex] || null;
  const isPostProcess = step === 'postprocess';
  const isPreCroppedItem = !!currentItem?.isPreCropped;
  const usePostProcessPreview = isPreCroppedItem;
  const isStep1Locked = isPreCroppedItem;

  // 動態載入 JSZip
  const loadJSZip = () => {
    return new Promise((resolve) => {
      if (window.JSZip) return resolve(window.JSZip);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve(window.JSZip);
      document.head.appendChild(script);
    });
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

    if (currentItem.isPreCropped) {
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = customWidth / customHeight;
      let drawWidth = customWidth;
      let drawHeight = customHeight;
      let dx = 0;
      let dy = 0;

      if (Number.isFinite(imageAspect) && imageAspect > 0) {
        if (imageAspect > targetAspect) {
          drawWidth = customWidth;
          drawHeight = customWidth / imageAspect;
          dy = (customHeight - drawHeight) / 2;
        } else if (imageAspect < targetAspect) {
          drawHeight = customHeight;
          drawWidth = customHeight * imageAspect;
          dx = (customWidth - drawWidth) / 2;
        }
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    } else {
      const previewRefSize = 680;
      const scale = customWidth / (aspect >= 1 ? previewRefSize : previewRefSize * aspect);

      const dw = img.naturalWidth * currentItem.zoom * scale;
      const dh = img.naturalHeight * currentItem.zoom * scale;
      const dx = (customWidth / 2) + (currentItem.crop.x * scale) - (dw / 2);
      const dy = (customHeight / 2) + (currentItem.crop.y * scale) - (dh / 2);

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        setFileSize((blob.size / 1024).toFixed(1));
      }
    }, 'image/jpeg', quality);
  }, [currentItem, aspect, customWidth, customHeight, quality]);

  useEffect(() => {
    const timer = setTimeout(estimateSize, 500);
    return () => clearTimeout(timer);
  }, [estimateSize]);

  useEffect(() => {
    if (!currentItem) return;
    setStep(currentItem.isPreCropped ? 'postprocess' : 'crop');
  }, [currentItem]);

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
  const renderToCanvasForZip = (item, targetWidth, targetHeight, targetQuality) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (item.isPreCropped) {
          const imageAspect = img.naturalWidth / img.naturalHeight;
          const targetAspect = targetWidth / targetHeight;
          let drawWidth = targetWidth;
          let drawHeight = targetHeight;
          let dx = 0;
          let dy = 0;

          if (Number.isFinite(imageAspect) && imageAspect > 0) {
            if (imageAspect > targetAspect) {
              drawWidth = targetWidth;
              drawHeight = targetWidth / imageAspect;
              dy = (targetHeight - drawHeight) / 2;
            } else if (imageAspect < targetAspect) {
              drawHeight = targetHeight;
              drawWidth = targetHeight * imageAspect;
              dx = (targetWidth - drawWidth) / 2;
            }
          }

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
        } else {
          const previewRefSize = 680;
          const scale = targetWidth / (targetWidth / targetHeight >= 1 ? previewRefSize : previewRefSize * (targetWidth / targetHeight));

          const dw = img.naturalWidth * item.zoom * scale;
          const dh = img.naturalHeight * item.zoom * scale;
          const dx = (targetWidth / 2) + (item.crop.x * scale) - (dw / 2);
          const dy = (targetHeight / 2) + (item.crop.y * scale) - (dh / 2);

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, dx, dy, dw, dh);
        }
        resolve(canvas.toDataURL('image/jpeg', targetQuality).split(',')[1]);
      };
      img.src = item.src;
    });
  };

  const renderToCanvasDataUrl = (item, targetWidth, targetHeight, targetQuality) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (item.isPreCropped) {
          const imageAspect = img.naturalWidth / img.naturalHeight;
          const targetAspect = targetWidth / targetHeight;
          let drawWidth = targetWidth;
          let drawHeight = targetHeight;
          let dx = 0;
          let dy = 0;

          if (Number.isFinite(imageAspect) && imageAspect > 0) {
            if (imageAspect > targetAspect) {
              drawWidth = targetWidth;
              drawHeight = targetWidth / imageAspect;
              dy = (targetHeight - drawHeight) / 2;
            } else if (imageAspect < targetAspect) {
              drawHeight = targetHeight;
              drawWidth = targetHeight * imageAspect;
              dx = (targetWidth - drawWidth) / 2;
            }
          }

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
        } else {
          const previewRefSize = 680;
          const scale = targetWidth / (targetWidth / targetHeight >= 1 ? previewRefSize : previewRefSize * (targetWidth / targetHeight));

          const dw = img.naturalWidth * item.zoom * scale;
          const dh = img.naturalHeight * item.zoom * scale;
          const dx = (targetWidth / 2) + (item.crop.x * scale) - (dw / 2);
          const dy = (targetHeight / 2) + (item.crop.y * scale) - (dh / 2);

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, dx, dy, dw, dh);
        }
        resolve(canvas.toDataURL('image/jpeg', targetQuality));
      };
      img.src = item.src;
    });
  };

  const batchDownloadZip = async () => {
    if (imageList.length === 0) return;
    setIsProcessing(true);
    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();
      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        const base64Data = await renderToCanvasForZip(item, customWidth, customHeight, quality);
        zip.file(`${item.name || `img_${i + 1}`}.jpg`, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `batch_export_${new Date().getTime()}.zip`;
      link.click();
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const downloadCurrentImage = async () => {
    if (!currentItem) return;
    setIsSingleExporting(true);
    try {
      const dataUrl = await renderToCanvasDataUrl(currentItem, customWidth, customHeight, quality);
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const baseName = currentItem.name || `img_${currentIndex + 1}`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${baseName}_crop_${stamp}.jpg`;
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
                  {usePostProcessPreview && (
                    <div className="absolute inset-0 bg-white">
                      <img
                        src={currentItem.src}
                        alt="Postprocess"
                        draggable="false"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                    {[...Array(9)].map((_, i) => <div key={i} className="border-[0.5px] border-white/30"></div>)}
                  </div>
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
                    opacity: usePostProcessPreview ? 0 : 1,
                    pointerEvents: usePostProcessPreview ? 'none' : 'auto'
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
            {!isPostProcess && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Move size={14} className="text-blue-500" /> 2. 影像對齊
                </h3>
                {currentItem?.isPreCropped && (
                  <div className="text-sm text-blue-600 font-semibold bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    此圖片已裁切，直接進入 Step 2，Step 1 已鎖定。
                  </div>
                )}
                <button
                  onClick={() => updateCurrentItem({ crop: { x: 0, y: 0 } })}
                  disabled={!currentItem || isStep1Locked}
                  className="w-full py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <AlignCenter size={16} /> 垂直水平置中
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => fitImageToFrame('width')}
                    disabled={!currentItem || isStep1Locked}
                    className="w-full py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ArrowLeftRight size={16} /> 寬度貼合
                  </button>
                  <button
                    onClick={() => fitImageToFrame('height')}
                    disabled={!currentItem || isStep1Locked}
                    className="w-full py-3 bg-slate-800 text-white hover:bg-blue-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <ArrowUpDown size={16} /> 高度貼合
                  </button>
                </div>
                <button
                  onClick={applyCurrentSettingsToAll}
                  disabled={!currentItem || isStep1Locked}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#5b3671] text-white hover:bg-[#6a3f84] rounded-2xl text-sm font-black transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <Copy size={16} /> 同步當前設定至全部
                </button>
                <div className="text-sm text-slate-400 font-semibold">
                  解析度與品質為全域設定，已套用全部圖片
                </div>
              </div>
            )}
            {isPostProcess && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Move size={14} className="text-blue-500" /> 2. 後製設定
                </h3>
                <div className="text-sm text-blue-600 font-semibold bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  此圖片已裁切，已略過 Step 1，可直接調整品質與匯出。
                </div>
              </div>
            )}

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
