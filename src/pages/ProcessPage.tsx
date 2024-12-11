import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applySobelFilter } from '../utils/applySobelFilter';
import './ProcessPage.css';

const ProcessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const file = location.state?.file;
  const [outputImage, setOutputImage] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          setIsProcessing(true);
          const processedImage = await applySobelFilter(imageData);
          setOutputImage(processedImage);
          setIsProcessing(false);
        };
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  return (
    <div className="process-page">
      <h1>Detecção de Bordas</h1>
      {isProcessing ? (
        <div className="loading">
          <p>Processando imagem...</p>
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {outputImage && (
            <canvas
              className="processed-canvas"
              width={outputImage.width}
              height={outputImage.height}
              ref={(canvas) => {
                if (canvas) {
                  const ctx = canvas.getContext('2d')!;
                  ctx.putImageData(outputImage, 0, 0);
                }
              }}
            />
          )}
          <button className="back-button" onClick={() => navigate('/')}>
            Voltar
          </button>
        </>
      )}
    </div>
  );
};

export default ProcessPage;
