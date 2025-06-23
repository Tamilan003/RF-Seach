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
        
        const normalizedData = jsonData.map((row, index) => {
          const normalizedRow = { id: index + 1 };
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().trim();
            const originalKey = key.trim();
            
            if (normalizedKey.includes('mobile') || normalizedKey.includes('phone') || normalizedKey.includes('number')) {
              normalizedRow.mobile = String(row[key]).replace(/\D/g, '');
            } else if (normalizedKey.includes('name')) {
              normalizedRow.name = String(row[key]).trim();
            } else if (normalizedKey.includes('status')) {
              normalizedRow.status = String(row[key]).trim();
            } else {
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

  const handleSearch = useCallback(() => {
    if (!searchNumbers.trim() || data.length === 0) return;

    setProcessing(true);
    const numbers = searchNumbers
      .split(/[\n,;]/)
      .map(num => num.replace(/\D/g, '').trim())
      .filter(num => num.length >= 10);

    if (numbers.length === 0) {
      alert('Please enter valid mobile numbers (10 digits)');
      setProcessing(false);
      return;
    }

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

  const handleExport = useCallback(() => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      const exportData = filteredData.map(row => {
        const exportRow = {
          'Mobile Number': row.mobile || '',
          'Name': row.name || '',
          'Status': row.status || ''
        };
        Object.keys(row).forEach(key => {
          if (!['id', 'mobile', 'name', 'status'].includes(key)) {
            exportRow[key] = row[key] || '';
          }
        });
        return exportRow;
      });

      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];
      
      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = String(row[header] || '').replace(/"/g, '""');
          return `"\${value}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvContent = csvRows.join('\n');
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `filtered_mobile_data_\${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      const csvContent = filteredData.map(row => 
        `\${row.mobile || ''},\${row.name || ''},\${row.status || ''},\${row.circle || ''}`
      ).join('\n');
      
      const finalContent = 'Mobile Number,Name,Status,Circle/State\n' + csvContent;
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(finalContent));
      element.setAttribute('download', `mobile_data_\${Date.now()}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }, [filteredData]);

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

  return <div>/* Your UI Code Goes Here (shortened for brevity) */</div>;
};

export default ExcelDataProcessor;
