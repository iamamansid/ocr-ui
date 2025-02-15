import React, { useState } from 'react';
import axios from 'axios';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/webpack';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Ensure PDF.js worker is loaded correctly
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'image/jpeg' || selectedFile.type === 'application/pdf')) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
      setOcrResult(null); // Clear previous OCR results
    } else {
      setFile(null);
      setFileName('');
      setError('Please upload a valid JPG or PDF file.');
    }
  };

  const convertPdfToJpg = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], 'converted.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      let fileToUpload = file;
      if (file.type === 'application/pdf') {
        fileToUpload = await convertPdfToJpg(file);
      }

      const formData = new FormData();
      formData.append('document', fileToUpload);

      const response = await axios.post(
        'https://spring-ai-backend-production.up.railway.app/api/webapp/v0/getDocScanned',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.data.result) {
        setOcrResult(response.data.response);
      } else {
        setError('Failed to process the document.');
      }
    } catch (err) {
      setError('An error occurred while processing the document.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow custom-width">
        <div className="card-header bg-primary text-white text-center">
          <h1 className="mb-0">Document OCR Scanner</h1>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="document" className="font-weight-bold">
                Upload Document (JPG or PDF):
              </label>
              <input
                type="file"
                className="form-control-file"
                id="document"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.pdf"
              />
              {fileName && <p className="mt-2 font-italic">Selected: {fileName}</p>}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !file}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>{' '}
                  Processing...
                </>
              ) : (
                'Scan Document'
              )}
            </button>
          </form>

          {error && <div className="alert alert-danger mt-4"><strong>Error:</strong> {error}</div>}

          {ocrResult && (
            <div className="mt-4">
              <h2 className="text-center mb-4">OCR Results</h2>
              <div className="card">
                <div className="card-header bg-secondary text-white">
                  <h5 className="card-title mb-0">Caption</h5>
                </div>
                <div className="card-body">
                  <p className="card-text">{ocrResult.captionResult}</p>
                </div>
              </div>
              <div className="card mt-3">
                <div className="card-header bg-secondary text-white">
                  <h5 className="card-title mb-0">Confidence</h5>
                </div>
                <div className="card-body">
                  <p className="card-text">{ocrResult.confidence}</p>
                </div>
              </div>
              <div className="card mt-3">
                <div className="card-header bg-secondary text-white">
                  <h5 className="card-title mb-0">Extracted Text</h5>
                </div>
                <div className="card-body">
                  <pre className="card-text ocr-text">{ocrResult.readResult}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
