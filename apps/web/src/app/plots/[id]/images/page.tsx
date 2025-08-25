'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { plotsAPI } from '@/lib/api';
import api from '@/lib/api';

type Plot = {
  id: string;
  name: string;
};

type TreeImage = {
  id: number;
  plot_id: number;
  location: string;
  tree_type: string;
  image_path: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  uploaded_at: string;
};

export default function TreeUploadPage({ params }: { params: { id: string } }) {
  const plotId = params.id;
  
  const [plot, setPlot] = useState<Plot | null>(null);
  const [images, setImages] = useState<TreeImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [treeType, setTreeType] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  
  // Client-side only code
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch plot and images when component mounts
  useEffect(() => {
    if (mounted && isAuthenticated && user && plotId) {
      loadPlot();
      loadImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, user, plotId]);

  const loadPlot = async () => {
    try {
      const response = await plotsAPI.getPlot(plotId);
      setPlot(response.data);
    } catch (err: any) {
      console.error('Error fetching plot:', err);
      setError(err.message || 'Failed to load plot details');
    }
  };

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/upload/plot/${plotId}/images`);
      setImages(response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching images:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setUploading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          setUploading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUploadError('Could not get current location');
          setUploading(false);
        }
      );
    } else {
      setUploadError('Geolocation is not supported by this browser');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    
    if (!selectedFile) {
      setUploadError('Please select an image file');
      return;
    }

    if (!treeType) {
      setUploadError('Tree type is required');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('treeImage', selectedFile);
      formData.append('plot_id', plotId);
      formData.append('location', location);
      formData.append('tree_type', treeType);
      formData.append('notes', notes);
      
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      
      const response = await api.post('/api/upload/tree-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload successful:', response.data);
      
      // Reset form
      setSelectedFile(null);
      setLocation('');
      setTreeType('');
      setLatitude('');
      setLongitude('');
      setNotes('');
      
      // Reset file input
      const fileInput = document.getElementById('imageFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload images
      await loadImages();
      
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setUploadError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      await api.delete(`/api/upload/image/${imageId}`);
      setImages(images.filter(img => img.id !== imageId));
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Tree Image Upload</h1>
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-2 justify-between">
          <Link href={`/plots/${plotId}/trees`} className="text-green-600 hover:text-green-800 mr-2">
            &larr; Back to Trees
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-800">
            {plot ? `Tree Images - ${plot.name}` : 'Tree Image Upload'}
          </h1>
          <p className="text-gray-600">Upload photos of individual trees for AI analysis and carbon estimation</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {/* Upload Form */}
        <div className="mb-8 border rounded-md p-4 bg-gray-50">
          <h2 className="text-xl font-semibold text-green-700 mb-4">Upload Tree Image</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {uploadError && (
              <div className="bg-red-50 text-red-600 p-3 rounded">
                {uploadError}
              </div>
            )}
            
            <div>
              <label className="block text-gray-700 mb-1" htmlFor="imageFile">
                Tree Image *
              </label>
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: JPG, PNG, GIF. Max size: 10MB
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="treeType">
                  Tree Type/Species *
                </label>
                <input
                  id="treeType"
                  type="text"
                  value={treeType}
                  onChange={(e) => setTreeType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Oak, Pine, Apple"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="location">
                  Location Description
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., North field, Near barn"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="latitude">
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., 40.7128"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="longitude">
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., -74.0060"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={uploading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
                >
                  Get GPS Location
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Additional notes about this tree..."
              />
            </div>
            
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Tree Image'}
            </button>
          </form>
        </div>

        {/* Images List */}
        <div>
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            Uploaded Tree Images ({images.length})
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : images.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-md text-center">
              <p className="text-gray-600">No tree images uploaded yet. Start by uploading one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-200">
                    <img
                      src={`http://localhost:4000/api/upload/serve/${image.image_path.split(/[/\\]/).pop()}`}
                      alt={`Tree ${image.tree_type}`}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-tree.png'; // fallback image
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800">{image.tree_type}</h3>
                    {image.location && (
                      <p className="text-sm text-gray-600">{image.location}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Uploaded: {new Date(image.uploaded_at).toLocaleDateString()}
                    </p>
                    {image.notes && (
                      <p className="text-sm text-gray-600 mt-2">{image.notes}</p>
                    )}
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
