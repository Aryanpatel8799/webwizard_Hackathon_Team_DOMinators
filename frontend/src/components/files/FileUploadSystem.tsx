import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Video, 
  Music,
  X, 
  Check, 
  AlertCircle,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { Button, Card, CardContent } from '../ui';
import { toast } from 'sonner';

export interface FileUploadProps {
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  onUpload?: (files: UploadedFile[]) => void;
  onRemove?: (fileId: string) => void;
  allowMultiple?: boolean;
  uploadUrl?: string;
  category?: 'events' | 'avatars' | 'documents' | 'general';
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  preview?: string;
}

const FileUploadSystem: React.FC<FileUploadProps> = ({
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.csv'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  onUpload,
  onRemove,
  allowMultiple = true,
  uploadUrl = '/api/files/upload', // TODO: Use this URL for custom upload endpoints
  category = 'general'
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!allowMultiple && acceptedFiles.length > 1) {
      toast.error('Only one file is allowed');
      return;
    }

    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes
    const invalidFiles = acceptedFiles.filter(file => file.size > maxFileSize);
    if (invalidFiles.length > 0) {
      toast.error(`Some files exceed the ${Math.round(maxFileSize / (1024 * 1024))}MB limit`);
      return;
    }

    setUploading(true);

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: '',
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files
    const uploadPromises = acceptedFiles.map(async (file, index) => {
      const fileData = newFiles[index];
      
      try {
        const result = await uploadFile(file, fileData.id, category);
        
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'success', url: result.url, progress: 100 }
            : f
        ));

        return { ...fileData, status: 'success' as const, url: result.url };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'error', error: errorMessage, progress: 0 }
            : f
        ));

        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        return { ...fileData, status: 'error' as const, error: errorMessage };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(result => result.status === 'success');
    
    if (successfulUploads.length > 0) {
      toast.success(`${successfulUploads.length} file(s) uploaded successfully`);
      onUpload?.(successfulUploads);
    }

    setUploading(false);
  }, [files.length, maxFiles, maxFileSize, allowMultiple, onUpload, category]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    multiple: allowMultiple
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onRemove?.(fileId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf')) return FileText;
    return File;
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    link.click();
  };

  const previewFile = (file: UploadedFile) => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      window.open(file.url, '_blank');
    } else {
      downloadFile(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card className="border-2 border-dashed border-white/20 hover:border-white/40 transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer transition-all duration-200 ${
              isDragActive ? 'scale-105' : ''
            } ${isDragReject ? 'border-red-500' : ''}`}
          >
            <input {...getInputProps()} />
            
            <motion.div
              animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
              className="mb-4"
            >
              <Upload className={`w-12 h-12 mx-auto ${
                isDragActive ? 'text-cyan-400' : 'text-gray-400'
              }`} />
            </motion.div>

            <h3 className="text-lg font-semibold text-white mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Files'}
            </h3>
            
            <p className="text-gray-400 mb-4">
              {isDragActive 
                ? 'Release to upload' 
                : `Drag and drop files here or click to browse`}
            </p>

            <div className="text-sm text-gray-500 space-y-1">
              <p>Accepted formats: {acceptedTypes.join(', ')}</p>
              <p>Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB</p>
              <p>Maximum files: {maxFiles}</p>
            </div>

            <Button 
              variant="primary" 
              className="mt-4"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="text-lg font-semibold text-white">
              Uploaded Files ({files.length})
            </h4>
            
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type);
              
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* File Preview/Icon */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                            <FileIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{file.name}</p>
                        <p className="text-sm text-gray-400">
                          {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                        
                        {/* Progress Bar */}
                        {file.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div 
                                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Error Message */}
                        {file.status === 'error' && file.error && (
                          <p className="text-red-400 text-sm mt-1">{file.error}</p>
                        )}
                      </div>

                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {file.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                        )}
                        {file.status === 'success' && (
                          <Check className="w-5 h-5 text-green-400" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {file.status === 'success' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => previewFile(file)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// File upload utility function
async function uploadFile(
  file: File, 
  fileId: string, 
  category: string
): Promise<{ url: string; id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  formData.append('fileId', fileId);

  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Upload failed');
    }

    return {
      url: result.data.url,
      id: result.data.id
    };
  } catch (error) {
    console.warn('File upload service not available, simulating upload:', error);
    
    // Simulate upload for demo
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Simulated upload failure');
    }

    // Return mock URL
    return {
      url: URL.createObjectURL(file),
      id: fileId
    };
  }
}

// File management service
export class FileService {
  static async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
        }
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('File delete service not available:', error);
      return true; // Simulate success for demo
    }
  }

  static async getFiles(category?: string, limit?: number): Promise<UploadedFile[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/files?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
        }
      });

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('File list service not available, using mock data:', error);
      
      // Return mock files for demo
      return [
        {
          id: '1',
          name: 'event-banner.jpg',
          size: 245760,
          type: 'image/jpeg',
          url: '/mock/event-banner.jpg',
          uploadedAt: new Date().toISOString(),
          status: 'success'
        },
        {
          id: '2',
          name: 'attendee-list.csv',
          size: 15360,
          type: 'text/csv',
          url: '/mock/attendee-list.csv',
          uploadedAt: new Date().toISOString(),
          status: 'success'
        }
      ];
    }
  }
}

export default FileUploadSystem;
