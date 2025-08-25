'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { plotsAPI, treesAPI } from '@/lib/api';

type Tree = {
  id: number;
  plot_id: number;
  species_code: string;
  height_meters: number | null;
  canopy_cover_m2: number | null;
  dbh_cm?: number | null;
  health_status?: string;
  captured_at: string;
  created_at?: string;
};

type Plot = {
  id: string;
  name: string;
};

export default function TreesPage({ params }: { params: { id: string } }) {
  const plotId = params.id;
  
  const [trees, setTrees] = useState<Tree[]>([]);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [species, setSpecies] = useState('');
  const [height, setHeight] = useState('');
  const [canopyDiameter, setCanopyDiameter] = useState('');
  const [dbh, setDbh] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editTreeId, setEditTreeId] = useState<number | null>(null);
  
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

  // Fetch plot and trees when component mounts
  useEffect(() => {
    if (mounted && isAuthenticated && user && plotId) {
      loadPlot();
      loadTrees();
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

  const loadTrees = async () => {
    try {
      setLoading(true);
      const response = await treesAPI.getTrees(plotId);
      // Debug the raw data received from the API
      console.log('Trees data received:', JSON.stringify(response.data, null, 2));
      
      // Add more detailed logging for each tree's numeric fields
      if (response.data && response.data.length > 0) {
        response.data.forEach((tree: Tree, index: number) => {
          console.log(`Tree ${index} (${tree.species_code}) numeric fields:`, {
            height_meters: tree.height_meters,
            dbh_cm: tree.dbh_cm,
            canopy_cover_m2: tree.canopy_cover_m2,
            typeof_height: typeof tree.height_meters,
            typeof_dbh: typeof tree.dbh_cm,
            typeof_canopy: typeof tree.canopy_cover_m2
          });
        });
      }
      
      setTrees(response.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching trees:', err);
      setError(err.message || 'Failed to load trees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!species) {
      setFormError('Species is required');
      return;
    }

    try {
      setSubmitting(true);
      
      // Make sure values are valid numbers before sending
      const heightValue = height ? parseFloat(height) : null;
      const canopyValue = canopyDiameter ? parseFloat(canopyDiameter) : null;
      const dbhValue = dbh ? parseFloat(dbh) : null;
      
      const treeData = {
        species_code: species,
        height_meters: heightValue,
        canopy_cover_m2: canopyValue,
        dbh_cm: dbhValue,
        health_status: 'healthy' // Default value
      };
      
      console.log('Sending tree data:', JSON.stringify(treeData, null, 2));
      
      if (editMode && editTreeId) {
        // Update existing tree
        console.log('Sending update for tree ID:', editTreeId, 'with data:', treeData);
        const updateResponse = await treesAPI.updateTree(editTreeId.toString(), treeData);
        console.log('Update response:', JSON.stringify(updateResponse.data, null, 2));
      } else {
        // Add new tree
        console.log('Adding new tree with data:', treeData);
        const addResponse = await treesAPI.addTree(plotId, treeData);
        console.log('Add response:', JSON.stringify(addResponse.data, null, 2));
      }
      
      // Reset form
      setSpecies('');
      setHeight('');
      setCanopyDiameter('');
      setDbh('');
      setEditMode(false);
      setEditTreeId(null);
      
      // Update tree list (optimistic update)
      await loadTrees();
    } catch (err: any) {
      console.error('Error saving tree:', err);
      setFormError(err.message || 'Failed to save tree');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tree: Tree) => {
    setSpecies(tree.species_code || '');
    setHeight(tree.height_meters !== undefined && tree.height_meters !== null ? tree.height_meters.toString() : '');
    setCanopyDiameter(tree.canopy_cover_m2 !== undefined && tree.canopy_cover_m2 !== null ? tree.canopy_cover_m2.toString() : '');
    setDbh(tree.dbh_cm !== undefined && tree.dbh_cm !== null ? tree.dbh_cm.toString() : '');
    setEditMode(true);
    setEditTreeId(tree.id);
    
    // Scroll to form
    document.getElementById('treeForm')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (treeId: number) => {
    if (!confirm('Are you sure you want to delete this tree?')) {
      return;
    }
    
    try {
      await treesAPI.deleteTree(treeId.toString());
      
      // Remove from local state (optimistic update)
      setTrees(trees.filter(tree => tree.id !== treeId));
    } catch (err: any) {
      console.error('Error deleting tree:', err);
      alert('Failed to delete tree: ' + (err.message || 'Unknown error'));
    }
  };

  const cancelEdit = () => {
    setSpecies('');
    setHeight('');
    setCanopyDiameter('');
    setDbh('');
    setEditMode(false);
    setEditTreeId(null);
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Tree Measurements</h1>
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
          <Link href="/plots" className="text-green-600 hover:text-green-800 mr-2">
            &larr; Back to Plots
          </Link>
          <div className="flex space-x-2">
            <Link 
              href={`/plots/${plotId}/images`} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
            >
              Tree Images
            </Link>
            <Link 
              href={`/plots/${plotId}/export`} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Registry Export
            </Link>
            <Link 
              href={`/plots/${plotId}/estimates`} 
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              Estimate Carbon
            </Link>
          </div>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-800">
            {plot ? `Trees in ${plot.name}` : 'Tree Measurements'}
          </h1>
          <p className="text-gray-600">Record and manage tree measurements for this plot</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {/* Tree Form */}
        <div id="treeForm" className="mb-8 border rounded-md p-4 bg-gray-50">
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            {editMode ? 'Edit Tree' : 'Add New Tree'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
                {formError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="species">
                  Species
                </label>
                <input
                  id="species"
                  type="text"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Pine, Oak, Maple"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="height">
                  Height (m)
                </label>
                <input
                  id="height"
                  type="number"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Tree height in meters"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="canopy">
                  Canopy Cover (m²)
                </label>
                <input
                  id="canopy"
                  type="number"
                  step="0.01"
                  value={canopyDiameter}
                  onChange={(e) => setCanopyDiameter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Canopy cover in square meters"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="dbh">
                  DBH (cm)
                </label>
                <input
                  id="dbh"
                  type="number"
                  step="0.01"
                  value={dbh}
                  onChange={(e) => setDbh(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Diameter at Breast Height in cm"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editMode ? 'Update Tree' : 'Add Tree'}
              </button>
              
              {editMode && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Trees List */}
        <div>
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            Recorded Trees
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : trees.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-md text-center">
              <p className="text-gray-600">No trees added yet. Start by adding one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Species</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Height (m)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">DBH (cm)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Canopy (m²)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date Added</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trees.map((tree) => (
                    <tr key={tree.id}>
                      <td className="py-3 px-4">{tree.species_code || 'N/A'}</td>
                      <td className="py-3 px-4">{typeof tree.height_meters === 'number' ? tree.height_meters.toFixed(2) : 'N/A'}</td>
                      <td className="py-3 px-4">{typeof tree.dbh_cm === 'number' ? tree.dbh_cm.toFixed(2) : 'N/A'}</td>
                      <td className="py-3 px-4">{typeof tree.canopy_cover_m2 === 'number' ? tree.canopy_cover_m2.toFixed(2) : 'N/A'}</td>
                      <td className="py-3 px-4">
                        {tree.captured_at ? new Date(tree.captured_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 flex space-x-2">
                        <button
                          onClick={() => handleEdit(tree)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tree.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
