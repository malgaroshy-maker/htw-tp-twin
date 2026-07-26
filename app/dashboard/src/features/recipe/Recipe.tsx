import { useState } from 'react';
import { useSimulator } from '../../hooks/useSimulator';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  Package,
  Grid3X3,
  Clock,
  AlertTriangle,
  Zap,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  Edit2,
  Save,
  X
} from 'lucide-react';
import type { RecipeInfo } from '../../hooks/simTypes';

export function Recipe() {
  const { state, recipes, selectRecipe, updateRecipe } = useSimulator();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RecipeInfo>>({});


  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-800 animate-pulse mx-auto mb-4" />
          <p className="text-slate-500 font-mono uppercase tracking-widest">Connecting to Simulator...</p>
        </div>
      </div>
    );
  }

  const { cfg, hmi, sts } = state;
  const activeRecipeId = cfg.active_recipe_id;

  const selectedRecipe = recipes.find((r) => r.recipe_id === (selectedRecipeId || activeRecipeId)) || null;
  const activeRecipe = recipes.find((r) => r.recipe_id === activeRecipeId) || null;

  const handleSelectRecipe = (recipeId: string) => {
    selectRecipe(recipeId);
  };

  const handleSave = async () => {
    if (!selectedRecipe) return;
    await updateRecipe({ ...editForm, recipe_id: selectedRecipe.recipe_id });
    setIsEditing(false);
  };

  const canChangeRecipe = hmi.recipe_change_enabled;

  const getGridPreview = (cols: number, rows: number, color: string) => {
    const cells = [];
    const total = cols * rows;
    for (let i = 0; i < total; i++) {
      cells.push(
        <div
          key={i}
          className="w-3 h-3 rounded-sm border border-slate-700/50"
          style={{ backgroundColor: `${color}40` }}
        />
      );
    }
    return cells;
  };

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 w-full bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 rounded-xl">
            <div className="bg-slate-950 p-3 rounded-[10px]">
              <Package className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Recipe Management</h1>
              {activeRecipe && (
                <Badge variant="info" className="px-3 py-1 text-[10px] uppercase font-black tracking-widest leading-none">
                  Active: {activeRecipe.recipe_name}
                </Badge>
              )}
            </div>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-3">Pack Format Configuration / {recipes.length} Recipes Available</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!canChangeRecipe && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <XCircle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Recipe Change Locked — {sts.machine_state === 'RUNNING' ? 'Machine Running' : sts.machine_state}
              </span>
            </div>
          )}
          {canChangeRecipe && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Recipe Change Allowed
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Recipe List — Left Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2">
          <Card title="Available Recipes" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-3">
              {recipes.map((recipe) => {
                const isActive = recipe.recipe_id === activeRecipeId;
                const isSelected = recipe.recipe_id === (selectedRecipeId || activeRecipeId);
                return (
                  <button
                    key={recipe.recipe_id}
                    onClick={() => {
                      if (!isEditing) {
                        setSelectedRecipeId(recipe.recipe_id);
                        setEditForm({ ...recipe });
                      }
                    }}
                    disabled={isEditing}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : isSelected
                        ? 'bg-slate-800/60 border-slate-600/50'
                        : 'bg-slate-900/40 border-slate-800/30 hover:bg-slate-800/40 hover:border-slate-700/50'
                    } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: recipe.display_color }}
                        />
                        <span className="text-sm font-black text-white uppercase tracking-tight">
                          {recipe.recipe_name}
                        </span>
                      </div>
                      {isActive && (
                        <Badge variant="success" className="text-[8px] font-black uppercase tracking-widest">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                      <span>{recipe.products_per_pack} pcs</span>
                      <span>{recipe.grid_cols}×{recipe.grid_rows}</span>
                      <span>{recipe.nominal_cycle_time_sec.toFixed(1)}s</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Quick Select Action */}
          <Card title="Quick Select" className="border-slate-800/50 bg-[#0C1118]">
            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                {canChangeRecipe
                  ? 'Select a recipe from the list, then activate it below.'
                  : 'Recipe change is not permitted while the machine is running or faulted.'}
              </p>
              <Button
                variant="primary"
                size="lg"
                className="w-full py-4 font-black uppercase tracking-widest"
                disabled={!canChangeRecipe || !selectedRecipeId || selectedRecipeId === activeRecipeId || isEditing}
                onClick={() => selectedRecipeId && handleSelectRecipe(selectedRecipeId)}
              >
                <ArrowRight className="w-4 h-4" />
                {selectedRecipeId === activeRecipeId
                  ? 'Already Active'
                  : `Activate ${selectedRecipe ? selectedRecipe.recipe_name : 'Recipe'}`}
              </Button>
              {!canChangeRecipe && (
                <p className="text-[10px] text-amber-500 font-bold text-center">
                  Stop the machine or switch to MANUAL mode to change recipes.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Recipe Detail — Right Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2">
          {selectedRecipe ? (
            <>
              {/* Recipe Header */}
              <Card className="border-slate-800/50 bg-[#0C1118]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-slate-700"
                      style={{ backgroundColor: isEditing ? editForm.display_color : selectedRecipe.display_color }}
                    />
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.recipe_name || ''}
                          onChange={(e) => setEditForm({ ...editForm, recipe_name: e.target.value })}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xl font-black text-white uppercase tracking-tight w-full max-w-xs focus:outline-none focus:border-indigo-500"
                        />
                      ) : (
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                          {selectedRecipe.recipe_name}
                        </h2>
                      )}
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                        ID: {selectedRecipe.recipe_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedRecipe.recipe_id === activeRecipeId && !isEditing && (
                      <Badge variant="success" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">
                        Currently Active
                      </Badge>
                    )}
                    {isEditing ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => { setIsEditing(false); setEditForm({ ...selectedRecipe }); }}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-1" /> Save
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => { setIsEditing(true); setEditForm({ ...selectedRecipe }); }}>
                        <Edit2 className="w-4 h-4 mr-1" /> Edit parameters
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Production Parameters */}
              <Card title="Production Parameters" className="border-slate-800/50 bg-[#0C1118]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Package className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Products / Pack</span>
                    </div>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.products_per_pack || ''}
                        onChange={(e) => setEditForm({ ...editForm, products_per_pack: parseInt(e.target.value) || 0 })}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-2xl font-black text-white font-mono leading-none focus:outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        {selectedRecipe.products_per_pack}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Grid3X3 className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Grid Layout</span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 text-white font-mono text-xl">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={editForm.grid_cols || ''}
                          onChange={(e) => setEditForm({ ...editForm, grid_cols: parseInt(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 w-16 focus:outline-none focus:border-indigo-500 text-center"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={editForm.grid_rows || ''}
                          onChange={(e) => setEditForm({ ...editForm, grid_rows: parseInt(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 w-16 focus:outline-none focus:border-indigo-500 text-center"
                        />
                      </div>
                    ) : (
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        {selectedRecipe.grid_cols}×{selectedRecipe.grid_rows}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Cycle Time</span>
                    </div>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={editForm.nominal_cycle_time_sec || ''}
                          onChange={(e) => setEditForm({ ...editForm, nominal_cycle_time_sec: parseFloat(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-2xl font-black text-white font-mono leading-none focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">s</span>
                      </div>
                    ) : (
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        {selectedRecipe.nominal_cycle_time_sec.toFixed(1)}<span className="text-lg text-slate-500">s</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="text-[9px] font-black uppercase tracking-widest">Spawn Interval</span>
                    </div>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editForm.product_spawn_interval_sec || ''}
                          onChange={(e) => setEditForm({ ...editForm, product_spawn_interval_sec: parseFloat(e.target.value) || 0 })}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-2xl font-black text-white font-mono leading-none focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">s</span>
                      </div>
                    ) : (
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        {selectedRecipe.product_spawn_interval_sec.toFixed(2)}<span className="text-lg text-slate-500">s</span>
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quality & Fault Tendencies */}
              <Card title="Quality & Fault Tendencies" className="border-slate-800/50 bg-[#0C1118]">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Reject Probability</span>
                      </div>
                      {isEditing && (
                        <span className="text-xs font-mono text-amber-400">{((editForm.reject_probability || 0) * 100).toFixed(1)}%</span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={editForm.reject_probability || 0}
                        onChange={(e) => setEditForm({ ...editForm, reject_probability: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    ) : (
                      <>
                        <div className="flex items-end gap-3">
                          <span className="text-3xl font-black text-amber-400 font-mono leading-none">
                            {(selectedRecipe.reject_probability * 100).toFixed(1)}%
                          </span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${selectedRecipe.reject_probability * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600 font-mono">
                          ~1 in {Math.round(1 / selectedRecipe.reject_probability)} packs rejected
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Jam Probability</span>
                      </div>
                      {isEditing && (
                        <span className="text-xs font-mono text-red-400">{((editForm.jam_probability || 0) * 100).toFixed(2)}%</span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        type="range"
                        min="0"
                        max="0.2"
                        step="0.005"
                        value={editForm.jam_probability || 0}
                        onChange={(e) => setEditForm({ ...editForm, jam_probability: parseFloat(e.target.value) })}
                        className="w-full accent-red-500"
                      />
                    ) : (
                      <>
                        <div className="flex items-end gap-3">
                          <span className="text-3xl font-black text-red-400 font-mono leading-none">
                            {(selectedRecipe.jam_probability * 100).toFixed(2)}%
                          </span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full bg-red-500 rounded-full transition-all"
                              style={{ width: `${selectedRecipe.jam_probability * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600 font-mono">
                          ~1 in {Math.round(1 / selectedRecipe.jam_probability)} cycles jam
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Grouping Layout Preview */}
              <Card title="Grouping Layout Preview" className="border-slate-800/50 bg-[#0C1118]">
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="grid gap-1 p-3 bg-slate-900/60 rounded-xl border border-slate-800/50"
                      style={{ gridTemplateColumns: `repeat(${isEditing ? editForm.grid_cols : selectedRecipe.grid_cols}, 1fr)` }}
                    >
                      {getGridPreview(
                        isEditing ? (editForm.grid_cols || 1) : selectedRecipe.grid_cols, 
                        isEditing ? (editForm.grid_rows || 1) : selectedRecipe.grid_rows, 
                        isEditing ? (editForm.display_color || '#333') : selectedRecipe.display_color
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      {isEditing ? editForm.grid_cols : selectedRecipe.grid_cols} columns × {isEditing ? editForm.grid_rows : selectedRecipe.grid_rows} rows
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-[10px] text-slate-500 font-mono">
                    {isEditing ? (
                      <>
                        <p>Total cells: {(editForm.grid_cols || 1) * (editForm.grid_rows || 1)}</p>
                        <p>Products used: {editForm.products_per_pack}</p>
                        <p>Empty cells: {(editForm.grid_cols || 1) * (editForm.grid_rows || 1) - (editForm.products_per_pack || 0)}</p>
                        <p>Throughput: ~{(3600 / (editForm.nominal_cycle_time_sec || 1)).toFixed(0)} packs/hr</p>
                      </>
                    ) : (
                      <>
                        <p>Total cells: {selectedRecipe.grid_cols * selectedRecipe.grid_rows}</p>
                        <p>Products used: {selectedRecipe.products_per_pack}</p>
                        <p>Empty cells: {selectedRecipe.grid_cols * selectedRecipe.grid_rows - selectedRecipe.products_per_pack}</p>
                        <p>Throughput: ~{(3600 / selectedRecipe.nominal_cycle_time_sec).toFixed(0)} packs/hr</p>
                      </>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="flex ml-auto items-center gap-3 border-l border-slate-800 pl-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Color</span>
                      <input
                        type="color"
                        value={editForm.display_color || '#000000'}
                        onChange={(e) => setEditForm({ ...editForm, display_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Notes */}
              {(selectedRecipe.notes || isEditing) && (
                <Card title="Notes" className="border-slate-800/50 bg-[#0C1118]">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                    {isEditing ? (
                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-400 focus:outline-none focus:border-indigo-500 resize-none h-20"
                        placeholder="Add notes about this recipe..."
                      />
                    ) : (
                      <p className="text-sm text-slate-400">{selectedRecipe.notes}</p>
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Package className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 font-mono uppercase tracking-widest">Select a recipe to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
