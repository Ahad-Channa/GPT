import React, { useRef, useEffect, useState } from 'react';

const FitText = ({ children, className = '', style = {}, align = 'left' }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const checkFit = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        
        if (textWidth > containerWidth && containerWidth > 0) {
          setScale(containerWidth / textWidth);
        } else {
          setScale(1);
        }
      }
    };
    
    checkFit();
    
    const observer = new ResizeObserver(checkFit);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [children]);

  const origin = align === 'center' ? 'center center' : (align === 'right' ? 'right center' : 'left center');
  const justify = align === 'center' ? 'justify-center' : (align === 'right' ? 'justify-end' : 'justify-start');

  return (
    <div ref={containerRef} className={`flex items-center ${justify} min-w-0 w-full overflow-hidden ${className}`} style={style}>
      <div 
        ref={textRef} 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: origin, 
          whiteSpace: 'nowrap',
          width: 'max-content',
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FitText;
