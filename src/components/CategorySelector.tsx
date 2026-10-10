import React, { useState } from 'react';
import { Tag, Search, Check, X } from 'lucide-react';
import { WordPressCategory } from '../types/wordpress';

interface CategorySelectorProps {
  allCategories: WordPressCategory[];
  selectedCategoryIds: number[];
  onChangeCategories: (ids: number[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  allCategories,
  selectedCategoryIds,
  onChangeCategories,
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = allCategories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const toggleCategory = (id: number) => {
    if (selectedCategoryIds.includes(id)) {
      onChangeCategories(selectedCategoryIds.filter((item) => item !== id));
    } else {
      onChangeCategories([...selectedCategoryIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-stone-900">Select Post Categories</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-stone-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter categories..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>
        </div>

        {/* Category Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-400">
              No categories found.
            </div>
          ) : (
            filtered.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-amber-50 text-amber-950 font-semibold border border-amber-200/80'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 font-normal">
                      ({cat.count})
                    </span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'border-stone-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {selectedCategoryIds.length} category selected
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-stone-900 text-amber-300 rounded-xl hover:bg-stone-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
