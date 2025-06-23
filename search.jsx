import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Search, Download, FileText, Phone, User, MapPin, Activity, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExcelDataProcessor = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchNumbers, setSearchNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [searchStats, setSearchStats] = useState({ total: 0, found: 0, notFound: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // File upload handler
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        // Normalize column names and data - keep all original columns
        const normalizedData = jsonData.map((row, index) => {
          const normalizedRow = { id: index + 1 };
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().trim();
            const originalKey = key.trim(); // Keep original key name
            
            if (normalizedKey.includes('mobile') || normalizedKey.includes('phone') || normalizedKey.includes('number')) {
              normalizedRow.mobile = String(row[key]).replace(/\D/g, '');
            } else if (normalizedKey.includes('name')) {
              normalizedRow.name = String(row[key]).trim();
            } else if (normalizedKey.includes('status')) {
              normalizedRow.status = String(row[key]).trim();
            } else {
              // Store all other columns with their original names
              normalizedRow[originalKey] = row[key];
            }
          });
          return normalizedRow;
        });

        setData(normalizedData);
        setFilteredData([]);
        setSearchStats({ total: normalizedData.length, found: 0, notFound: 0 });
        setCurrentPage(1);
      } catch (error) {
        alert('Error reading file. Please ensure it\'s a valid Excel file.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  // Search function
  const handleSearch = useCallback(() => {
    if (!searchNumbers.trim() || data.length === 0) return;

    setProcessing(true);
    
    // Parse search numbers
    const numbers = searchNumbers
      .split(/[\n,;]/)
      .map(num => num.replace(/\D/g, '').trim())
      .filter(num => num.length >= 10);

    if (numbers.length === 0) {
      alert('Please enter valid mobile numbers (10 digits)');
      setProcessing(false);
      return;
    }

    // Search in data
    const results = [];
    const foundNumbers = new Set();
    
    numbers.forEach(searchNum => {
      const matches = data.filter(row => {
        const mobile = String(row.mobile || '').replace(/\D/g, '');
        return mobile.includes(searchNum) || searchNum.includes(mobile);
      });
      
      if (matches.length > 0) {
        results.push(...matches);
        foundNumbers.add(searchNum);
      }
    });

    // Remove duplicates
    const uniqueResults = results.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    setFilteredData(uniqueResults);
    setSearchStats({
      total: numbers.length,
      found: foundNumbers.size,
      notFound: numbers.length - foundNumbers.size
    });
    setCurrentPage(1);
    setProcessing(false);
  }, [searchNumbers, data]);

  // Export function (Direct download without popup)
  const handleExport = useCallback(() => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      // Prepare data for CSV export - include all original columns
      const exportData = filteredData.map(row => {
        const exportRow = {
          'Mobile Number': row.mobile || '',
          'Name': row.name || '',
          'Status': row.status || ''
        };
        
        // Add all other columns with their original names
        Object.keys(row).forEach(key => {
          if (!['id', 'mobile', 'name', 'status'].includes(key)) {
            exportRow[key] = row[key] || '';
          }
        });
        
        return exportRow;
      });

      // Convert to CSV
      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];
      
      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = String(row[header] || '').replace(/"/g, '""');
          return `"${value}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Create download using data URL to avoid popup blockers
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `filtered_mobile_data_${new Date().toISOString().slice(0,10)}.csv`;
      
      // Trigger download immediately
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      // Fallback method if data URL fails
      const csvContent = filteredData.map(row => 
        `${row.mobile || ''},${row.name || ''},${row.status || ''},${row.circle || ''}`
      ).join('\n');
      
      const finalContent = 'Mobile Number,Name,Status,Circle/State\n' + csvContent;
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(finalContent));
      element.setAttribute('download', `mobile_data_${Date.now()}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }, [filteredData]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const clearSearch = () => {
    setSearchNumbers('');
    setFilteredData([]);
    setSearchStats({ total: 0, found: 0, notFound: 0 });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Excel Data Processor</h1>
          <p className="text-gray-600">Upload Excel files and search mobile numbers efficiently</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <Upload className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Upload Excel File</h2>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">Processing file...</span>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="fileInput"
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {fileName || 'Choose Excel file to upload'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx and .xls files up to 100MB
                  </p>
                </label>
              </>
            )}
          </div>
          
          {data.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  File loaded successfully: {data.length.toLocaleString()} records
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search Section */}
        {data.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Search className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Search Mobile Numbers</h2>
              </div>
              {searchNumbers && (
                <button
                  onClick={clearSearch}
                  className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <textarea
                  value={searchNumbers}
                  onChange={(e) => setSearchNumbers(e.target.value)}
                  placeholder="Enter mobile numbers (one per line or comma-separated)&#10;Example:&#10;9876543210&#10;8765432109, 7654321098"
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div className="flex flex-col justify-between">
                <button
                  onClick={handleSearch}
                  disabled={processing || !searchNumbers.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </button>
                
                {filteredData.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="w-full mt-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Export Results
                  </button>
                )}
              </div>
            </div>
            
            {/* Search Stats */}
            {searchStats.total > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{searchStats.total}</div>
                  <div className="text-sm text-blue-800">Total Searched</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{searchStats.found}</div>
                  <div className="text-sm text-green-800">Found</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{searchStats.notFound}</div>
                  <div className="text-sm text-red-800">Not Found</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {filteredData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Search Results ({filteredData.length.toLocaleString()} records)
              </h2>
            </div>
            
            {/* Results Table - Dynamic columns based on Excel data */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        Mobile Number
                      </div>
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Name
                      </div>
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                      <div className="flex items-center">
                        <Activity className="w-4 h-4 mr-2" />
                        Status
                      </div>
                    </th>
                    {/* Dynamic columns for all other fields */}
                    {paginatedData.length > 0 && Object.keys(paginatedData[0])
                      .filter(key => !['id', 'mobile', 'name', 'status'].includes(key))
                      .map(key => (
                        <th key={key} className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {key}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-4 py-3 font-mono text-sm">
                        {row.mobile || 'N/A'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3">
                        {row.name || 'N/A'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.status?.toLowerCase() === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : row.status?.toLowerCase() === 'inactive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {row.status || 'N/A'}
                        </span>
                      </td>
                      {/* Dynamic columns data */}
                      {Object.keys(row)
                        .filter(key => !['id', 'mobile', 'name', 'status'].includes(key))
                        .map(key => (
                          <td key={key} className="border border-gray-200 px-4 py-3">
                            {row[key] || 'N/A'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No results message */}
        {searchStats.total > 0 && filteredData.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No matches found</h3>
            <p className="text-yellow-700">
              None of the searched mobile numbers were found in the uploaded data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelDataProcessor;
