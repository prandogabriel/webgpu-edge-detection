import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UploadPage.css';
import demoImage from '../assets/demo-image.jpg';

const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(demoImage);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      navigate('/process', { state: { file: selectedFile } });
    } else {
      alert('Por favor, selecione uma imagem.');
    }
  };

  return (
    <div className="upload-page">
      <header className="upload-header">
        <h1>Detecção de Bordas com WebGPU utilizando Filtro de Sobel</h1>
        <p>Carregue uma imagem para aplicar a detecção de bordas usando a tecnologia WebGPU e o filtro de Sobel. Abaixo está uma imagem de exemplo.</p>
      </header>

      <div className="image-display">
        <img src={previewUrl || demoImage} alt="Pré-visualização" className="preview-image" />
      </div>

      <label className="upload-button">
        <input type="file" accept="image/*" onChange={handleFileChange} hidden />
        <span>{selectedFile ? 'Alterar Imagem' : 'Selecionar Imagem'}</span>
      </label>

      <button onClick={handleUpload} className="process-button">
        Avançar
      </button>
    </div>
  );
};

export default UploadPage;
