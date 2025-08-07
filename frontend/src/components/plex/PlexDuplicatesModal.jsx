import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  FilmIcon,
  TvIcon,
  MusicalNoteIcon,
  PhotoIcon,
  EyeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';

const PlexDuplicatesModal = ({ isOpen, onClose, service }) => {
  const { token } = useAuth(); // Get JWT token for authentication
  const [duplicates, setDuplicates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(new Set());
  const [error, setError] = useState(null);

  const libraryIcons = {
    movie: FilmIcon,
    show: TvIcon,
    artist: MusicalNoteIcon,
    photo: PhotoIcon
  };

  useEffect(() => {
    if (isOpen && service?.id) {
      fetchDuplicates();
    }
  }, [isOpen, service?.id]); // Only depend on service ID, not the entire service object

  const fetchDuplicates = async (forceScan = false) => {
    if (!service?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `/api/plex/${service.id}/duplicates${forceScan ? '?force_scan=true' : ''}`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      
      if (data.success) {
        setDuplicates(data);
      } else {
        setError(data.error || 'Failed to fetch duplicates');
      }
    } catch (err) {
      setError('Network error while fetching duplicates');
      console.error('Error fetching duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteDuplicate = async (ratingKey, itemTitle) => {
    if (!window.confirm(`Delete "${itemTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(prev => new Set([...prev, ratingKey]));
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/plex/${service.id}/duplicates/${ratingKey}`, {
        method: 'DELETE',
        headers
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh duplicates after successful deletion
        await fetchDuplicates();
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (err) {
      alert('Network error while deleting duplicate');
      console.error('Error deleting duplicate:', err);
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(ratingKey);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (!ms) return 'Unknown';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getFilteredGroups = () => {
    if (!duplicates?.duplicatesByLibrary) return [];
    
    let allGroups = [];
    Object.entries(duplicates.duplicatesByLibrary).forEach(([libraryName, library]) => {
      if (selectedLibrary === 'all' || selectedLibrary === libraryName) {
        library.duplicateGroups.forEach(group => {
          allGroups.push({
            ...group,
            libraryName,
            libraryType: library.libraryType
          });
        });
      }
    });

    if (searchTerm) {
      allGroups = allGroups.filter(group => 
        group.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return allGroups.sort((a, b) => b.totalSize - a.totalSize);
  };

  const getTotalStats = () => {
    const groups = getFilteredGroups();
    return {
      groups: groups.length,
      items: groups.reduce((sum, group) => sum + group.items.length, 0),
      size: groups.reduce((sum, group) => sum + group.totalSize, 0)
    };
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Dialog.Title as="h3" className="text-xl font-medium leading-6 text-white">
                      Plex Duplicate Manager
                    </Dialog.Title>
                    <p className="text-sm text-gray-400 mt-1">
                      {service?.name} - Find and remove duplicate media files
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={selectedLibrary}
                    onChange={(e) => setSelectedLibrary(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Libraries</option>
                    {duplicates?.duplicatesByLibrary && Object.entries(duplicates.duplicatesByLibrary).map(([name, library]) => (
                      <option key={name} value={name}>
                        {name} ({library.totalGroups} groups)
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchDuplicates(false)}
                      disabled={loading}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center text-sm"
                    >
                      <ArrowPathIcon className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={() => fetchDuplicates(true)}
                      disabled={loading}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center text-sm"
                    >
                      <MagnifyingGlassIcon className="w-4 h-4 mr-1" />
                      Live Scan
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-400">Scanning for duplicates...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <p className="text-red-400">{error}</p>
                      <button
                        onClick={fetchDuplicates}
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : duplicates && duplicates.totalDuplicates > 0 ? (
                    <>
                      {/* Stats Summary */}
                      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-white">{getTotalStats().groups}</div>
                            <div className="text-sm text-gray-400">Duplicate Groups</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-400">{getTotalStats().items}</div>
                            <div className="text-sm text-gray-400">Total Items</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-400">{formatFileSize(getTotalStats().size)}</div>
                            <div className="text-sm text-gray-400">Total Size</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-400">{duplicates.libraryCount}</div>
                            <div className="text-sm text-gray-400">Libraries</div>
                          </div>
                        </div>
                        
                        {/* Data Source Indicator */}
                        <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between text-xs">
                          <div className="flex items-center">
                            {duplicates.cached !== false ? (
                              <>
                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                <span className="text-blue-400">Cached Results</span>
                                {duplicates.scannedAt && (
                                  <span className="text-gray-500 ml-2">
                                    • Last scan: {new Date(duplicates.scannedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                <span className="text-green-400">Live Scan Results</span>
                              </>
                            )}
                          </div>
                          {duplicates.note && (
                            <span className="text-gray-500 text-xs">{duplicates.note}</span>
                          )}
                        </div>
                      </div>

                      {/* Duplicate Groups */}
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        {getFilteredGroups().map((group, groupIndex) => {
                          const LibraryIcon = libraryIcons[group.libraryType] || FilmIcon;
                          
                          return (
                            <div key={groupIndex} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                              <div className="flex items-center mb-4">
                                <LibraryIcon className="w-5 h-5 text-blue-400 mr-2" />
                                <h4 className="text-lg font-medium text-white flex-1">
                                  {group.title} {group.year && `(${group.year})`}
                                </h4>
                                <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                  {group.libraryName}
                                </span>
                              </div>
                              
                              <div className="space-y-3">
                                {group.items.map((item, itemIndex) => (
                                  <div key={item.ratingKey} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                          <div>
                                            <span className="text-gray-400">Size:</span>
                                            <span className="text-white ml-2">{formatFileSize(item.totalSize)}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400">Duration:</span>
                                            <span className="text-white ml-2">{formatDuration(item.duration)}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400">Quality:</span>
                                            <span className="text-white ml-2">{item.bestQuality?.videoResolution || 'Unknown'}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-400">
                                              {item.videoFileCount ? `Files (${item.videoFileCount}):` : 'Added:'}
                                            </span>
                                            <span className="text-white ml-2">
                                              {item.videoFileCount ? (
                                                <span className="inline-flex items-center">
                                                  {item.videoFileCount}
                                                  {item.videoFileCount > 1 && (
                                                    <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded">
                                                      MULTI
                                                    </span>
                                                  )}
                                                </span>
                                              ) : (
                                                item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'Unknown'
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {item.files && item.files.length > 0 && (
                                          <div className="mt-2">
                                            <details className="cursor-pointer">
                                              <summary className="text-xs text-blue-400 hover:text-blue-300">
                                                View {item.files.length} file(s)
                                              </summary>
                                              <div className="mt-2 space-y-1 pl-4 border-l border-gray-600">
                                                {item.files.map((file, fileIndex) => (
                                                  <div key={fileIndex} className="text-xs text-gray-400">
                                                    <div className="font-mono">{file.file}</div>
                                                    <div className="text-gray-500">
                                                      {formatFileSize(file.size)} • {file.videoResolution} • {file.videoCodec}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </details>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <button
                                        onClick={() => deleteDuplicate(item.ratingKey, item.title)}
                                        disabled={deleting.has(item.ratingKey)}
                                        className="ml-4 p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center"
                                        title="Delete this duplicate"
                                      >
                                        {deleting.has(item.ratingKey) ? (
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <TrashIcon className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : duplicates ? (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
                      <p className="text-green-400 text-lg">No duplicates found!</p>
                      <p className="text-gray-400 text-sm mt-2">Your Plex library is clean.</p>
                    </div>
                  ) : null}
                </div>

                {/* Warning */}
                <div className="mt-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-300">
                      <strong>Important:</strong> Deleting duplicates is permanent and cannot be undone. 
                      Consider the file quality, size, and codec before deleting. 
                      Higher resolution and better quality files are typically preferred.
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PlexDuplicatesModal;