import React from 'react';

interface WatermarkProps {
  show: boolean;
}

const Watermark: React.FC<WatermarkProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-hidden opacity-15 flex flex-col justify-between p-12" data-cy="watermark">
      {/* Create repeating diagonal pattern */}
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex justify-between transform -rotate-45 origin-center"
          style={{ 
            marginLeft: `-${rowIndex * 10}px`, 
            marginRight: `-${rowIndex * 10}px` 
          }}
        >
          {Array.from({ length: 3 }).map((_, colIndex) => (
            <div
              key={`watermark-${rowIndex}-${colIndex}`}
              className="font-bold text-primary-600 select-none mx-5 uppercase text-xl sm:text-2xl md:text-3xl"
            >
              Sayina E-Signature
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Watermark;
