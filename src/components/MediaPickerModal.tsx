import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Check,
  X,
  Search,
  AlertCircle,
  RefreshCw,
  Trash2,
  Sparkles,
  Sliders,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { ConnectionConfig, WordPressMedia } from '../types/wordpress';
import { wordPressService } from '../services/wordpress';
import {
  convertToWebP,
  formatFileSize,
  CompressionResult,
} from '../services/imageOptimizer';
import { Language, translations } from '../utils/i18n';

interface MediaPickerModalProps {
  connectionConfig: ConnectionConfig | null;
  isOpen: boolean;
  onClose: () => void;
  currentFeaturedMediaId?: number;
  currentFeaturedMediaUrl?: string;
  onSelectFeaturedMedia: (mediaId: number, mediaUrl: string) => void;
  onRemoveFeaturedMedia: () => void;
  lang?: Language;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  connectionConfig,
  isOpen,
  onClose,
  currentFeaturedMediaId,
  currentFeaturedMediaUrl,
  onSelectFeaturedMedia,
  onRemoveFeaturedMedia,
  lang = 'bn',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [mediaList, setMediaList] = useState<WordPressMedia[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');

  // Source & WebP optimization state
  const [rawSourceFile, setRawSourceFile] = useState<File | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<number>(0.82); // 82% quality sweet spot
  const [altText, setAltText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'library' && connectionConfig) {
      loadMediaLibrary();
    }
  }, [isOpen, activeTab, connectionConfig]);

  const loadMediaLibrary = async () => {
    if (!connectionConfig) return;
    setLoadingList(true);
    setLibraryError(null);
    try {
      const res = await wordPressService.getMediaList(connectionConfig, {
        page: 1,
        perPage: 24,
        search: librarySearch,
      });
      setMediaList(res.media);
    } catch (err: any) {
      setLibraryError(err.message || 'Failed to load media library.');
    } finally {
      setLoadingList(false);
    }
  };

  const processAndOptimizeImage = async (file: File, quality = qualityPreset) => {
    setIsCompressing(true);
    setUploadError(null);
    try {
      const result = await convertToWebP(file, {
        quality,
        maxDimension: 1600, // HD Retina web blogging standard
      });
      setCompressionResult(result);
    } catch (err: any) {
      setUploadError(
        lang === 'bn'
          ? 'ছবি WebP তে কনভার্ট করতে সমস্যা হয়েছে: ' + (err.message || '')
          : 'Failed to convert image to WebP: ' + (err.message || '')
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(
        lang === 'bn'
          ? 'শুধুমাত্র ছবি ফাইল (JPEG, PNG, WebP, GIF) গ্রহণযোগ্য।'
          : 'Only image files are supported.'
      );
      return;
    }

    setRawSourceFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    await processAndOptimizeImage(file, qualityPreset);
  };

  const handleChangeQuality = async (newQuality: number) => {
    setQualityPreset(newQuality);
    if (rawSourceFile) {
      await processAndOptimizeImage(rawSourceFile, newQuality);
    }
  };

  const handleUploadAndSelect = async () => {
    if (!compressionResult || !connectionConfig || isUploading) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Upload the compressed WebP file to WordPress
      const media = await wordPressService.uploadMedia(
        connectionConfig,
        compressionResult.file,
        uploadTitle,
        altText,
        (pct) => setUploadProgress(pct)
      );

      // Successfully uploaded! Set as featured image
      onSelectFeaturedMedia(media.id, media.source_url);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {lang === 'bn' ? 'ফিচার্ড ইমেজ যুক্ত করুন' : 'Featured Image'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {lang === 'bn' ? 'স্বয়ংক্রিয় WebP কনভার্সন ও কম্প্রেশন' : 'Auto WebP Conversion & Compression'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-100 border-b border-stone-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 rounded-xl transition ${
              activeTab === 'upload' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {lang === 'bn' ? 'গ্যালারি থেকে আপলোড (WebP)' : 'Upload from Phone (WebP)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`py-2 rounded-xl transition ${
              activeTab === 'library' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {lang === 'bn' ? 'মিডিয়া লাইব্রেরি' : 'Media Library'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: UPLOAD & AUTO WEBP COMPRESSION */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!compressionResult && !isCompressing ? (
                <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer bg-stone-50/60 hover:bg-amber-50/40 transition text-center active:scale-[0.99]">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2.5 shadow-2xs">
                    <Upload className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-stone-900">
                    {lang === 'bn' ? 'অ্যান্ড্রয়েড গ্যালারি থেকে ছবি বাছুন' : 'Choose from Android Gallery'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Auto WebP
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {lang === 'bn' ? 'কোয়ালিটি ঠিক রেখে KB তে কম্প্রেস' : 'KB Compressed & Sharp'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : isCompressing ? (
                <div className="p-8 text-center space-y-3 bg-stone-50 rounded-3xl border border-stone-200">
                  <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-stone-900">
                    {lang === 'bn' ? 'WebP তে কনভার্ট ও কম্প্রেস করা হচ্ছে...' : 'Converting to WebP & compressing...'}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {lang === 'bn' ? 'কোয়ালিটি অক্ষত রেখে সাইজ কমানো হচ্ছে' : 'Preserving retina clarity while shrinking file size'}
                  </p>
                </div>
              ) : compressionResult ? (
                <div className="space-y-3.5">
                  {/* WebP Image Preview */}
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 max-h-48 flex items-center justify-center shadow-2xs">
                    <img
                      src={compressionResult.previewUrl}
                      alt="WebP Preview"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-stone-900/85 text-emerald-300 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                      <FileCheck className="w-3 h-3 text-emerald-400" />
                      <span>WebP ({formatFileSize(compressionResult.compressedSize)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRawSourceFile(null);
                        setCompressionResult(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-white hover:bg-stone-900"
                      title="Clear and pick another image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* WebP Compression Stats Card */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {lang === 'bn' ? 'WebP কনভার্সন সফল!' : 'WebP Optimized Successfully!'}
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        -{compressionResult.savingsPercentage}% {lang === 'bn' ? 'সাইজ সাশ্রয়' : 'smaller'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
                      <div className="p-2 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-stone-400 block">
                          {lang === 'bn' ? 'আসল সাইজ' : 'Original Size'}
                        </span>
                        <strong className="text-stone-700 font-bold block text-[11px]">
                          {formatFileSize(compressionResult.originalSize)}
                        </strong>
                      </div>

                      <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                        <span className="text-[10px] text-emerald-100 block">
                          {lang === 'bn' ? 'WebP সাইজ' : 'WebP Size'}
                        </span>
                        <strong className="font-extrabold block text-[11px]">
                          {formatFileSize(compressionResult.compressedSize)}
                        </strong>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-stone-400 block">
                          {lang === 'bn' ? 'রেজোলিউশন' : 'Resolution'}
                        </span>
                        <strong className="text-stone-700 font-bold block text-[11px]">
                          {compressionResult.compressedWidth}px
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Quality Presets Selector */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-stone-600" />
                        {lang === 'bn' ? 'কোয়ালিটি মোড:' : 'Quality Preset:'}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-500">
                        {Math.round(qualityPreset * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleChangeQuality(0.75)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                          qualityPreset === 0.75
                            ? 'bg-stone-900 text-amber-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {lang === 'bn' ? 'কম KB (75%)' : 'Compact (75%)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeQuality(0.82)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                          qualityPreset === 0.82
                            ? 'bg-stone-900 text-amber-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {lang === 'bn' ? 'ব্যালান্সড (82%)' : 'Balanced (82%)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeQuality(0.92)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                          qualityPreset === 0.92
                            ? 'bg-stone-900 text-amber-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {lang === 'bn' ? 'রেটিনা (92%)' : 'Sharp (92%)'}
                      </button>
                    </div>
                  </div>

                  {/* Alt Text Input */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      {lang === 'bn' ? 'ছবির অল্টারনেটিভ টেক্সট (Alt Text for SEO)' : 'Alt Text (for SEO)'}
                    </label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder={
                        lang === 'bn'
                          ? 'ছবিটি সম্পর্কে একটি সংক্ষিপ্ত বিবরণ লিখুন...'
                          : 'Describe the image for screen readers and SEO...'
                      }
                      className="w-full text-xs rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              ) : null}

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-stone-600 font-semibold">
                    <span>{lang === 'bn' ? 'ওয়ার্ডপ্রেসে আপলোড হচ্ছে...' : 'Uploading to WordPress...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{uploadError}</p>
                </div>
              )}

              {compressionResult && (
                <button
                  type="button"
                  onClick={handleUploadAndSelect}
                  disabled={isUploading}
                  className="w-full py-3 px-4 text-xs font-bold bg-stone-900 text-amber-300 rounded-2xl hover:bg-stone-800 disabled:opacity-50 transition active:scale-98 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading
                    ? (lang === 'bn' ? 'WebP আপলোড হচ্ছে...' : 'Uploading WebP to WordPress...')
                    : (lang === 'bn'
                        ? `WebP আপলোড করুন (${formatFileSize(compressionResult.compressedSize)})`
                        : `Upload Optimized WebP (${formatFileSize(compressionResult.compressedSize)})`)}
                </button>
              )}
            </div>
          )}

          {/* TAB 2: MEDIA LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder={lang === 'bn' ? 'মিডিয়া খুঁজুন...' : 'Search media...'}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadMediaLibrary}
                  disabled={loadingList}
                  className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin text-amber-600' : ''}`} />
                </button>
              </div>

              {libraryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs">
                  {libraryError}
                </div>
              )}

              {loadingList && mediaList.length === 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="aspect-square bg-stone-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : mediaList.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">
                  {lang === 'bn' ? 'মিডিয়া লাইব্রেরিতে কোনো ছবি পাওয়া যায়নি।' : 'No images found in Media Library.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaList.map((item) => {
                    const isSelected = item.id === currentFeaturedMediaId;
                    const thumbUrl =
                      item.media_details?.sizes?.thumbnail?.source_url ||
                      item.media_details?.sizes?.medium?.source_url ||
                      item.source_url;
                    const isWebP = item.source_url.toLowerCase().endsWith('.webp');

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectFeaturedMedia(item.id, item.source_url);
                          onClose();
                        }}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition active:scale-95 group ${
                          isSelected ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <img
                          src={thumbUrl}
                          alt={item.alt_text || 'Media thumbnail'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isWebP && (
                          <span className="absolute bottom-1 left-1 bg-stone-900/80 text-[8px] font-bold text-emerald-300 px-1 py-0.2 rounded">
                            WEBP
                          </span>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Remove button if featured image is currently set */}
        {currentFeaturedMediaId && currentFeaturedMediaId > 0 && (
          <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onRemoveFeaturedMedia();
                onClose();
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {lang === 'bn' ? 'ফিচার্ড ছবি মুছুন' : 'Remove Featured Image'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Cancel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
