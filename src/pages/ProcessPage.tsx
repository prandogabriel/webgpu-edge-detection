import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applySobelFilter } from '../utils/applySobelFilter';

const ProcessPage: React.FC = () => {
  const location = useLocation();
  const file = location.state?.file;
  const [outputImage, setOutputImage] = useState<ImageData | null>(null);

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

          const processedImage = await applySobelFilter(imageData);
          setOutputImage(processedImage);
        };
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  return (
    <div>
      <h1>Imagem Processada</h1>
      {outputImage && (
        <canvas
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
    </div>
  );
};

export default ProcessPage;
