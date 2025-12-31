import React, { useState } from 'react';
import { PaletteColor } from '../types';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { DEFAULT_PALETTE } from '../constants';

interface PaletteEditorProps {
  palette: PaletteColor[];
  setPalette: (colors: PaletteColor[]) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
}

const PaletteEditor: React.FC<PaletteEditorProps> = ({
  palette,
  setPalette,
  selectedColor,
  setSelectedColor,
}) => {
  const [newColorHex, setNewColorHex] = useState('#000000');

  const addColor = () => {
    // Check if color already exists
    if (palette.some((p) => p.hex.toLowerCase() === newColorHex.toLowerCase())) {
      return;
    }
    const newColor: PaletteColor = {
      id: crypto.randomUUID(),
      hex: newColorHex,
      name: 'Custom',
    };
    setPalette([...palette, newColor]);
  };

  const removeColor = (id: string) => {
    const newPalette = palette.filter((c) => c.id !== id);
    setPalette(newPalette);
    if (selectedColor === palette.find(c => c.id === id)?.hex && newPalette.length > 0) {
        setSelectedColor(newPalette[0].hex);
    }
  };

  const resetPalette = () => {
    setPalette(DEFAULT_PALETTE);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-slate-700">Palette ({palette.length})</h3>
        <button
          onClick={resetPalette}
          className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
          title="Reset to Default"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2 mb-4 max-h-40 overflow-y-auto pr-1">
        {palette.map((color) => (
          <div
            key={color.id}
            className="group relative w-8 h-8 rounded-full border border-slate-200 cursor-pointer transition-transform hover:scale-110"
            style={{
              backgroundColor: color.hex,
              boxShadow: selectedColor === color.hex ? `0 0 0 2px white, 0 0 0 4px ${color.hex}` : 'none',
              zIndex: selectedColor === color.hex ? 10 : 1
            }}
            onClick={() => setSelectedColor(color.hex)}
            title={color.name || color.hex}
          >
            {palette.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeColor(color.id);
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
              >
                <Trash2 size={8} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end border-t pt-3">
        <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Add Color</label>
            <div className="flex gap-2">
                <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="h-9 w-9 p-0 border-0 rounded cursor-pointer"
                />
                <input 
                    type="text" 
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="flex-1 text-sm border rounded px-2 text-slate-600 font-mono"
                    maxLength={7}
                />
            </div>
        </div>
        <button
          onClick={addColor}
          className="h-9 w-9 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export default PaletteEditor;
