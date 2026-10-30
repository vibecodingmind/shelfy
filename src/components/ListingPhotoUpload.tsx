import React from 'react';
import { X } from 'lucide-react';
import { MIN_LISTING_PHOTOS } from '../server/domain/listings.js';
import { api } from '../lib/api.js';

interface ListingPhotoUploadProps {
  label: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}

function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  return Promise.all(
    list.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read image.'));
          reader.readAsDataURL(file);
        })
    )
  );
}

export const ListingPhotoUpload: React.FC<ListingPhotoUploadProps> = ({ label, photos, onChange }) => {
  const count = photos.length;
  const metMinimum = count >= MIN_LISTING_PHOTOS;

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const dataUrls = await readFilesAsDataUrls(files);
    onChange([...photos, ...dataUrls].slice(0, 16));
    e.target.value = '';
  };

  const removeAt = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-400">{label}</span>
        <span className={`font-mono font-bold ${metMinimum ? 'text-emerald-400' : 'text-amber-400'}`}>
          {count}/{MIN_LISTING_PHOTOS} min
        </span>
      </div>
      <p className="text-[10px] text-slate-500">
        Add at least {MIN_LISTING_PHOTOS} clear photos (JPEG, PNG, or WebP). You can select multiple files at once.
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onPickFiles}
        className="block w-full text-slate-300"
      />
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {photos.map((src, i) => (
            <div key={`${i}-${src.slice(0, 24)}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-slate-950/80 text-white flex items-center justify-center"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export async function uploadListingPhotos(dataUrls: string[], kind: string): Promise<string[]> {
  const urls: string[] = [];
  for (const dataUrl of dataUrls) {
    const res = await api.uploadImage(dataUrl, kind);
    if (res.success && res.data?.url) urls.push(res.data.url);
  }
  if (urls.length < MIN_LISTING_PHOTOS) {
    throw new Error(`Upload at least ${MIN_LISTING_PHOTOS} photos (${urls.length} uploaded successfully).`);
  }
  return urls;
}
