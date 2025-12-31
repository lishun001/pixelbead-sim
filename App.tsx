import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PaletteColor, GridSettings, GridData } from './types';
import { DEFAULT_PALETTE, MAX_GRID_SIZE, MIN_GRID_SIZE } from './constants';
import PaletteEditor from './components/PaletteEditor';
import BeadBoard from './components/BeadBoard';
import { findNearestColor, rgbToHex } from './utils/colorUtils';
import { Upload, Settings2, Grid3X3, Download, Eraser, ZoomIn, ZoomOut, FileJson, FolderOpen, PaintBucket, PieChart, X, GitMerge, Check, Scissors, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Undo2, Redo2, Plus, Minus } from 'lucide-react';

// History State Interface
interface HistoryState {
  gridData: GridData;
  settings: GridSettings;
  originalImage: HTMLImageElement | null;
}

const App: React.FC = () => {
  // --- State ---
  const [palette, setPalette] = useState<PaletteColor[]>(DEFAULT_PALETTE);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PALETTE[0].hex);
  
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    width: 15,
    height: 15,
    lockAspectRatio: true,
  });

  const [gridData, setGridData] = useState<GridData>([]);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  // History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // UI State
  const [zoom, setZoom] = useState<number>(12); // px size per bead
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [tool, setTool] = useState<'pen' | 'bucket'>('pen');
  const [showCropMenu, setShowCropMenu] = useState<boolean>(false);
  
  // Modals
  const [showStats, setShowStats] = useState<boolean>(false);
  
  // Export Modal State
  const [exportModal, setExportModal] = useState<{
      isOpen: boolean;
      type: 'image' | 'json';
      filename: string;
  }>({
      isOpen: false,
      type: 'image',
      filename: ''
  });

  const jsonInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---

  // Deep clone grid to ensure history immutability
  const cloneGrid = (grid: GridData): GridData => grid.map(row => [...row]);

  const addToHistory = (newGrid: GridData, newSettings: GridSettings, newImage: HTMLImageElement | null) => {
      setHistory(prev => {
          const currentHistory = prev.slice(0, historyIndex + 1);
          const newState: HistoryState = {
              gridData: cloneGrid(newGrid),
              settings: { ...newSettings },
              originalImage: newImage
          };
          
          // Limit history size
          if (currentHistory.length >= 30) {
              currentHistory.shift();
          }
          
          return [...currentHistory, newState];
      });
      setHistoryIndex(prev => Math.min(prev + 1, 29)); // Ensure index tracks correctly
  };

  // Helper to sync state and history
  const updateStateAndHistory = (newGrid: GridData, newSettings: GridSettings, newImage: HTMLImageElement | null) => {
      setGridData(newGrid);
      setGridSettings(newSettings);
      setOriginalImage(newImage);
      addToHistory(newGrid, newSettings, newImage);
  };

  // --- Initialization ---
  useEffect(() => {
    // Initial load
    if (history.length === 0) {
        const initialGrid = Array(gridSettings.height).fill(null).map(() => 
            Array(gridSettings.width).fill('#FFFFFF')
        );
        updateStateAndHistory(initialGrid, gridSettings, null);
    }
  }, []);

  // Auto-zoom when grid size changes
  useEffect(() => {
    const maxDimension = Math.max(gridSettings.width, gridSettings.height);
    const targetPixelSize = 700;
    const calculatedZoom = Math.floor(targetPixelSize / maxDimension);
    const newZoom = Math.max(5, Math.min(40, calculatedZoom));
    setZoom(newZoom);
  }, [gridSettings.width, gridSettings.height]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) {
                  handleRedo();
              } else {
                  handleUndo();
              }
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
              e.preventDefault();
              handleRedo();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]); // Re-bind when history changes

  // --- Logic ---

  // 1. Core Logic: Generate Grid from Image
  const generateGridFromImage = (img: HTMLImageElement, width: number, height: number, currentPalette: PaletteColor[]): Promise<GridData> => {
      return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
              resolve([]);
              return;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image resized
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          
          const newGrid: GridData = [];

          for (let y = 0; y < height; y++) {
              const row: string[] = [];
              for (let x = 0; x < width; x++) {
                  const index = (y * width + x) * 4;
                  const r = pixels[index];
                  const g = pixels[index + 1];
                  const b = pixels[index + 2];
                  
                  const originalHex = rgbToHex(r, g, b);
                  const nearest = findNearestColor(originalHex, currentPalette);
                  row.push(nearest);
              }
              newGrid.push(row);
          }
          resolve(newGrid);
      });
  };

  // 2. Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Calculate dimensions
        let newWidth = gridSettings.width;
        let newHeight = gridSettings.height;
        
        if (gridSettings.lockAspectRatio) {
            const aspect = img.width / img.height;
            newHeight = Math.round(newWidth / aspect);
            newHeight = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, newHeight));
        }

        const newSettings = { ...gridSettings, width: newWidth, height: newHeight };
        
        setIsProcessing(true);
        // Process immediately
        const newGrid = await generateGridFromImage(img, newWidth, newHeight, palette);
        setIsProcessing(false);

        updateStateAndHistory(newGrid, newSettings, img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 3. Re-process (Button click)
  const handleReprocess = async () => {
      if (!originalImage) return;
      setIsProcessing(true);
      // Small delay to allow UI render
      setTimeout(async () => {
          const newGrid = await generateGridFromImage(originalImage, gridSettings.width, gridSettings.height, palette);
          setIsProcessing(false);
          updateStateAndHistory(newGrid, gridSettings, originalImage);
      }, 50);
  };

  // 4. Handle Resize (Slider Change)
  const handleResize = async (width: number, height: number) => {
      const newSettings = { ...gridSettings, width, height };
      
      if (originalImage) {
          // If image exists, regenerate grid
          // Note: We don't show loading spinner for slider drag to keep it responsive, 
          // or we could debounce. For now, we do it directly.
          // Since generateGridFromImage is effectively sync (canvas), it's fast enough for small grids.
          const newGrid = await generateGridFromImage(originalImage, width, height, palette);
          updateStateAndHistory(newGrid, newSettings, originalImage);
      } else {
          // Manual resize (Crop/Pad)
          const newGrid = Array(height).fill(null).map((_, y) => 
              Array(width).fill(null).map((_, x) => {
                  if (y < gridData.length && x < gridData[0].length) {
                      return gridData[y][x];
                  }
                  return '#FFFFFF';
              })
          );
          updateStateAndHistory(newGrid, newSettings, null);
      }
  };

  // 5. Interactions (Draw or Replace)
  const handleBeadClick = (x: number, y: number) => {
    if (x < 0 || x >= gridSettings.width || y < 0 || y >= gridSettings.height) return;

    let newGrid = cloneGrid(gridData);

    if (tool === 'bucket') {
        const targetColor = newGrid[y][x];
        if (targetColor === selectedColor) return;
        newGrid = newGrid.map(row => 
            row.map(cellColor => cellColor === targetColor ? selectedColor : cellColor)
        );
    } else {
        newGrid[y][x] = selectedColor;
    }

    // Painting detaches image? Optional choice. 
    // Keeping image reference allows "Re-Process" to work, but resizing might overwrite.
    // Let's keep image reference for now as requested by user behavior in previous prompt implicitly.
    updateStateAndHistory(newGrid, gridSettings, originalImage);
  };

  // 6. Edge Modification (Add/Remove Rows/Cols)
  const handleEdgeModify = (direction: 'top' | 'bottom' | 'left' | 'right', action: 'add' | 'remove') => {
      let newWidth = gridSettings.width;
      let newHeight = gridSettings.height;

      // Calc new dimensions
      if (direction === 'top' || direction === 'bottom') {
          newHeight = action === 'add' ? newHeight + 1 : newHeight - 1;
      } else {
          newWidth = action === 'add' ? newWidth + 1 : newWidth - 1;
      }

      // Validation
      if (newWidth < MIN_GRID_SIZE || newHeight < MIN_GRID_SIZE) {
          // Alert only if removing, silent ignore if logic calls it improperly
          if (action === 'remove') alert(`Cannot reduce grid smaller than ${MIN_GRID_SIZE}x${MIN_GRID_SIZE}`);
          return;
      }
      if (newWidth > MAX_GRID_SIZE || newHeight > MAX_GRID_SIZE) {
          if (action === 'add') alert(`Cannot expand grid larger than ${MAX_GRID_SIZE}x${MAX_GRID_SIZE}`);
          return;
      }

      let newGrid = cloneGrid(gridData);
      const white = '#FFFFFF';

      if (action === 'remove') {
          if (direction === 'top') newGrid = newGrid.slice(1);
          if (direction === 'bottom') newGrid = newGrid.slice(0, -1);
          if (direction === 'left') newGrid = newGrid.map(row => row.slice(1));
          if (direction === 'right') newGrid = newGrid.map(row => row.slice(0, -1));
      } else {
          // Add
          if (direction === 'top') {
              const newRow = Array(newWidth).fill(white);
              newGrid.unshift(newRow);
          }
          if (direction === 'bottom') {
              const newRow = Array(newWidth).fill(white);
              newGrid.push(newRow);
          }
          if (direction === 'left') {
              newGrid = newGrid.map(row => [white, ...row]);
          }
          if (direction === 'right') {
              newGrid = newGrid.map(row => [...row, white]);
          }
      }
      
      const newSettings = { ...gridSettings, width: newWidth, height: newHeight };
      
      // Detach image on edge modify to preserve pixel placement
      updateStateAndHistory(newGrid, newSettings, null);
  };

  // 7. Undo / Redo
  const handleUndo = () => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const prevState = history[newIndex];
          setGridData(prevState.gridData);
          setGridSettings(prevState.settings);
          setOriginalImage(prevState.originalImage);
          setHistoryIndex(newIndex);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const nextState = history[newIndex];
          setGridData(nextState.gridData);
          setGridSettings(nextState.settings);
          setOriginalImage(nextState.originalImage);
          setHistoryIndex(newIndex);
      }
  };

  // 8. Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            if (!json.settings || !json.palette) {
                alert("Invalid project file format.");
                return;
            }

            setPalette(json.palette);
            
            let newGrid: GridData = [];
            const w = json.settings.width;
            const h = json.settings.height;

            if (json.beads && Array.isArray(json.beads)) {
                newGrid = Array(h).fill(null).map(() => Array(w).fill('#FFFFFF'));
                json.beads.forEach((b: any) => {
                    if (b.y >= 0 && b.y < h && b.x >= 0 && b.x < w) {
                        newGrid[b.y][b.x] = b.hex;
                    }
                });
            } else if (json.grid && Array.isArray(json.grid)) {
                newGrid = json.grid;
            } else {
                 newGrid = Array(h).fill(null).map(() => Array(w).fill('#FFFFFF'));
            }

            updateStateAndHistory(newGrid, json.settings, null);

        } catch (err) {
            console.error(err);
            alert("Failed to parse JSON file.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const triggerImport = () => {
      jsonInputRef.current?.click();
  };

  // 9. Stats & Merge
  const getStats = () => {
      const stats: Record<string, number> = {};
      let totalBeads = 0;

      gridData.forEach(row => {
          row.forEach(color => {
              stats[color] = (stats[color] || 0) + 1;
              totalBeads++;
          });
      });

      const sortedStats = Object.entries(stats)
        .sort(([, a], [, b]) => b - a)
        .map(([hex, count]) => {
            const colorInfo = palette.find(p => p.hex.toLowerCase() === hex.toLowerCase());
            return {
                hex,
                name: colorInfo ? colorInfo.name || hex : hex,
                count,
                percentage: totalBeads > 0 ? ((count / totalBeads) * 100).toFixed(1) : '0'
            };
        });
      
      return { totalBeads, sortedStats };
  };

  const handleMergeRareColors = () => {
      const { totalBeads, sortedStats } = getStats();
      if (totalBeads === 0) return;
      
      const THRESHOLD = 0.03;
      const commonColors = sortedStats.filter(s => (s.count / totalBeads) >= THRESHOLD);
      const rareColors = sortedStats.filter(s => (s.count / totalBeads) < THRESHOLD);
      
      if (commonColors.length === 0 || rareColors.length === 0) {
          alert("No suitable colors to merge.");
          return;
      }
      
      if (!window.confirm(`Merge ${rareColors.length} rare colors (<${THRESHOLD * 100}%)?`)) return;

      const commonPalette: PaletteColor[] = commonColors.map(c => ({
          id: c.hex,
          hex: c.hex,
          name: c.name
      }));

      const replacementMap: Record<string, string> = {};
      rareColors.forEach(rare => {
          replacementMap[rare.hex] = findNearestColor(rare.hex, commonPalette);
      });

      const newGrid = gridData.map(row => row.map(cell => replacementMap[cell] || cell));
      updateStateAndHistory(newGrid, gridSettings, originalImage);
  };
  
  // 10. Exports
  const openExportModal = (type: 'image' | 'json') => {
      setExportModal({ isOpen: true, type, filename: type === 'image' ? 'pixel-bead-pattern' : 'pixel-project' });
  };

  const handleExportConfirm = () => {
      const filename = exportModal.filename || 'export';
      if (exportModal.type === 'image') exportImage(filename);
      else exportJSON(filename);
      setExportModal(prev => ({ ...prev, isOpen: false }));
  };

  const exportImage = (filename: string) => {
    const canvas = document.createElement('canvas');
    const pixelSize = 20;
    canvas.width = gridSettings.width * pixelSize;
    canvas.height = gridSettings.height * pixelSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    gridData.forEach((row, y) => {
        row.forEach((color, x) => {
            ctx.fillStyle = color;
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        });
    });

    try {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert("Export failed.");
    }
  };

  const exportJSON = (filename: string) => {
    const beads: Array<{x: number, y: number, hex: string}> = [];
    gridData.forEach((row, y) => row.forEach((color, x) => beads.push({ x, y, hex: color })));

    const data = {
        version: "1.1",
        timestamp: new Date().toISOString(),
        settings: gridSettings,
        palette,
        beads 
    };
    
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Export failed.");
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      
      {/* --- Sidebar --- */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-lg flex-shrink-0">
        <div className="p-5 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Grid3X3 className="text-blue-600" />
                PixelBead
            </h1>
            <p className="text-xs text-slate-500 mt-1">Simulate & Design</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Image Upload */}
            <section>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Upload size={16} /> Import Image
                </h2>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer text-center group">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                        <div className="mx-auto w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload size={20} />
                        </div>
                        <p className="text-sm text-slate-600">Click or drag image</p>
                    </div>
                </div>
            </section>

            {/* Board Settings */}
            <section>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Settings2 size={16} /> Board Size
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs text-slate-600">Width (Beads)</label>
                            <span className="text-xs font-mono font-bold">{gridSettings.width}</span>
                        </div>
                        <input
                            type="range"
                            min={MIN_GRID_SIZE}
                            max={MAX_GRID_SIZE}
                            value={gridSettings.width}
                            onChange={(e) => {
                                const newW = parseInt(e.target.value);
                                let newH = gridSettings.height;
                                if (gridSettings.lockAspectRatio && originalImage) {
                                    const aspect = originalImage.height / originalImage.width;
                                    newH = Math.round(newW * aspect);
                                    newH = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, newH));
                                }
                                handleResize(newW, newH);
                            }}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs text-slate-600">Height (Beads)</label>
                            <span className="text-xs font-mono font-bold">{gridSettings.height}</span>
                        </div>
                        <input
                            type="range"
                            min={MIN_GRID_SIZE}
                            max={MAX_GRID_SIZE}
                            value={gridSettings.height}
                            disabled={gridSettings.lockAspectRatio && !!originalImage}
                            onChange={(e) => handleResize(gridSettings.width, parseInt(e.target.value))}
                            className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 ${gridSettings.lockAspectRatio && originalImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="lockAspect"
                            checked={gridSettings.lockAspectRatio}
                            onChange={(e) => setGridSettings(prev => ({...prev, lockAspectRatio: e.target.checked}))}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="lockAspect" className="text-sm text-slate-700">Lock Aspect Ratio</label>
                    </div>
                </div>
            </section>

            {/* Palette */}
            <section>
                <PaletteEditor 
                    palette={palette} 
                    setPalette={(newPalette) => setPalette(newPalette)}
                    selectedColor={selectedColor}
                    setSelectedColor={setSelectedColor}
                />
            </section>
            
            <button
                onClick={handleReprocess}
                disabled={!originalImage}
                className="w-full py-2 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
                Re-Process Image
            </button>

        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
             <button 
                onClick={() => setShowStats(true)}
                className="flex items-center justify-center gap-2 w-full bg-white border border-slate-300 py-2 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
             >
                <PieChart size={16} /> Statistics
             </button>

             <div className="grid grid-cols-2 gap-2">
                 <button 
                    onClick={triggerImport}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-300 py-2 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                 >
                    <FolderOpen size={16} /> Import
                 </button>
                 <button 
                    onClick={() => openExportModal('image')}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-300 py-2 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                 >
                    <Download size={16} /> Image
                 </button>
             </div>
             
             <input 
                type="file" 
                ref={jsonInputRef}
                accept=".json" 
                onChange={handleImportJSON} 
                className="hidden" 
             />
             
             <button 
                onClick={() => openExportModal('json')}
                className="flex items-center justify-center gap-2 w-full bg-slate-800 border border-slate-800 py-2 rounded text-sm font-medium text-white hover:bg-slate-700 transition-colors"
             >
                <FileJson size={16} /> Export JSON
             </button>
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
        
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white shadow-md rounded-full px-4 py-2 flex items-center gap-4 border border-slate-200">
            {/* Undo/Redo */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                 <button 
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={18} />
                </button>
                 <button 
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 size={18} />
                </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                <button 
                    onClick={() => setZoom(z => Math.max(5, z - 2))}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                    title="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
                <span className="text-xs font-mono w-8 text-center">{zoom}px</span>
                <button 
                    onClick={() => setZoom(z => Math.min(40, z + 2))}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                    title="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
            </div>
            
            {/* Tools */}
            <div className="flex items-center gap-2 relative">
                 <button 
                    onClick={() => setShowGridLines(!showGridLines)}
                    className={`p-1.5 rounded transition-colors ${showGridLines ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Toggle Grid Lines"
                >
                    <Grid3X3 size={18} />
                </button>
                 <div className="w-px h-5 bg-slate-200 mx-1"></div>
                 <button 
                    onClick={() => { setTool('pen'); setSelectedColor('#FFFFFF'); }}
                    className={`p-1.5 rounded transition-colors ${selectedColor === '#FFFFFF' && tool === 'pen' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Eraser / White Bead"
                >
                    <Eraser size={18} />
                </button>
                <button 
                    onClick={() => { setTool('bucket'); }}
                    className={`p-1.5 rounded transition-colors ${tool === 'bucket' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Replace Color (Fill)"
                >
                    <PaintBucket size={18} />
                </button>
                
                 <div className="w-px h-5 bg-slate-200 mx-1"></div>
                 
                 <div className="relative">
                    <button 
                        onClick={() => setShowCropMenu(!showCropMenu)}
                        className={`p-1.5 rounded transition-colors ${showCropMenu ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="Modify Board Edges"
                    >
                        <Scissors size={18} />
                    </button>
                    {showCropMenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white shadow-xl border border-slate-200 rounded-lg p-3 z-30 w-48">
                            <div className="text-xs font-semibold text-slate-500 mb-2 text-center uppercase tracking-wider">Modify Edges</div>
                            <div className="space-y-2">
                                {/* Top */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium w-16">
                                        <ArrowUp size={14} /> Top
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdgeModify('top', 'remove')} className="p-1 hover:bg-red-50 text-red-600 rounded bg-slate-50 border border-slate-200" title="Remove Top Row"><Minus size={14}/></button>
                                        <button onClick={() => handleEdgeModify('top', 'add')} className="p-1 hover:bg-blue-50 text-blue-600 rounded bg-slate-50 border border-slate-200" title="Add Top Row"><Plus size={14}/></button>
                                    </div>
                                </div>
                                {/* Bottom */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium w-16">
                                        <ArrowDown size={14} /> Btm
                                    </div>
                                    <div className="flex gap-1">
                                         <button onClick={() => handleEdgeModify('bottom', 'remove')} className="p-1 hover:bg-red-50 text-red-600 rounded bg-slate-50 border border-slate-200" title="Remove Bottom Row"><Minus size={14}/></button>
                                         <button onClick={() => handleEdgeModify('bottom', 'add')} className="p-1 hover:bg-blue-50 text-blue-600 rounded bg-slate-50 border border-slate-200" title="Add Bottom Row"><Plus size={14}/></button>
                                    </div>
                                </div>
                                {/* Left */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium w-16">
                                        <ArrowLeft size={14} /> Left
                                    </div>
                                     <div className="flex gap-1">
                                         <button onClick={() => handleEdgeModify('left', 'remove')} className="p-1 hover:bg-red-50 text-red-600 rounded bg-slate-50 border border-slate-200" title="Remove Left Column"><Minus size={14}/></button>
                                         <button onClick={() => handleEdgeModify('left', 'add')} className="p-1 hover:bg-blue-50 text-blue-600 rounded bg-slate-50 border border-slate-200" title="Add Left Column"><Plus size={14}/></button>
                                    </div>
                                </div>
                                {/* Right */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium w-16">
                                        <ArrowRight size={14} /> Right
                                    </div>
                                     <div className="flex gap-1">
                                         <button onClick={() => handleEdgeModify('right', 'remove')} className="p-1 hover:bg-red-50 text-red-600 rounded bg-slate-50 border border-slate-200" title="Remove Right Column"><Minus size={14}/></button>
                                         <button onClick={() => handleEdgeModify('right', 'add')} className="p-1 hover:bg-blue-50 text-blue-600 rounded bg-slate-50 border border-slate-200" title="Add Right Column"><Plus size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-8 relative flex items-center justify-center bg-slate-200/50 cursor-crosshair">
            {isProcessing && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-blue-600 font-semibold animate-pulse">Processing...</div>
                </div>
            )}
            
            <BeadBoard 
                gridData={gridData} 
                width={gridSettings.width}
                height={gridSettings.height}
                zoom={zoom}
                showGridLines={showGridLines}
                onBeadClick={handleBeadClick}
                isPainting={false} 
            />
        </div>
        
        {/* Statistics Modal */}
        {showStats && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <PieChart className="text-blue-600" size={20} /> Statistics
                        </h2>
                        <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                        {(() => {
                            const { totalBeads, sortedStats } = getStats();
                            return (
                                <div className="space-y-4">
                                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                                        <div className="text-3xl font-bold text-slate-800">{totalBeads}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Total Beads</div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {sortedStats.map((stat) => (
                                            <div key={stat.hex} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                                                <div 
                                                    className="w-8 h-8 rounded shadow-sm border border-slate-200"
                                                    style={{ backgroundColor: stat.hex }}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-slate-700">{stat.name}</div>
                                                    <div className="text-xs text-slate-400">{stat.hex}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-slate-800">{stat.count}</div>
                                                    <div className="text-xs text-slate-500">{stat.percentage}%</div>
                                                </div>
                                            </div>
                                        ))}
                                        {sortedStats.length === 0 && (
                                            <p className="text-center text-slate-400 py-4">Board is empty.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end">
                        <button 
                            onClick={handleMergeRareColors}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            <GitMerge size={16} /> Merge Rare Colors (&lt;3%)
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Export Naming Modal */}
        {exportModal.isOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-xl w-96 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        {exportModal.type === 'image' ? <Download size={20} className="text-blue-600"/> : <FileJson size={20} className="text-blue-600"/>}
                        Export {exportModal.type === 'image' ? 'Image' : 'Project'}
                    </h2>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            File Name
                        </label>
                        <input 
                            type="text" 
                            autoFocus
                            value={exportModal.filename}
                            onChange={(e) => setExportModal(prev => ({...prev, filename: e.target.value}))}
                            onKeyDown={(e) => e.key === 'Enter' && handleExportConfirm()}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Enter file name"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setExportModal(prev => ({...prev, isOpen: false}))}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleExportConfirm}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded font-medium text-sm transition-colors flex items-center gap-2"
                        >
                            <Check size={16} /> Save
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;