import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const ImageDropzone = ({
  selectedFile,
  onFileSelect,
  onFileRemove,
  maxSizeMB = 5,
  className
}) => {
  const [errorMsg, setErrorMsg] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles, fileRejections) => {
      setErrorMsg(null);

      if (fileRejections && fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const error = rejection.errors[0];
        if (error.code === 'file-too-large') {
          setErrorMsg(`File exceeds ${maxSizeMB}MB limit. Please upload a smaller image.`);
        } else if (error.code === 'file-invalid-type') {
          setErrorMsg('Unsupported format. Only JPG, PNG, and WebP images are allowed.');
        } else {
          setErrorMsg(error.message || 'Invalid file uploaded.');
        }
        return;
      }

      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onFileSelect(file);
      }
    },
    [maxSizeMB, onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
  });

  const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : null;

  return (
    <div className={cn("space-y-3", className)}>
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isDragActive && !isDragReject && "border-primary bg-primary/5 scale-[1.01]",
            isDragReject && "border-destructive bg-destructive/5",
            !isDragActive && "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
          role="region"
          aria-label="Image file drag and drop area"
        >
          <input {...getInputProps()} aria-label="Upload product image" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>

          <p className="text-sm font-medium text-foreground">
            {isDragActive
              ? isDragReject
                ? "Unsupported format!"
                : "Drop the image here..."
              : "Drag & drop your product image here, or click to browse"}
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Supports JPEG, PNG, WebP (Max {maxSizeMB}MB)
          </p>
        </div>
      ) : (
        <div className="relative rounded-lg border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30 flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Product preview"
                className="h-full w-full object-contain"
                onLoad={() => {
                  // Revoke object URL after loading to avoid memory leaks
                }}
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-semibold text-foreground">
              <Check className="h-4 w-4 text-emerald-500" />
              <span>{selectedFile.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Size: {(selectedFile.size / 1024).toFixed(1)} KB • Type: {selectedFile.type || 'image'}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Ready for Pillow WebP optimization upon submission
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFileRemove}
              className="text-destructive hover:bg-destructive/10"
              aria-label="Remove selected image"
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
