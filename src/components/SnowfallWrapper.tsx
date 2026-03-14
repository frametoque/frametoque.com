'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Snowfall = dynamic(() => import('react-snowfall').then(mod => mod.Snowfall), {
  ssr: false,
});

const SnowfallWrapper = () => {
  const [showSnow, setShowSnow] = useState(false);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;

    if (month === 12) setShowSnow(true);
  }, []);

  if (!showSnow) return null;

  return (
    <Snowfall
      snowflakeCount={120}          
      speed={[0.3, 1.5]}            
      wind={[-0.2, 0.5]}           
      radius={[1, 3]}              
      color="rgba(255,255,255,0.15)" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none',
        transition: 'opacity 1s ease-in-out',
      }}
    />
  );
};

export default SnowfallWrapper;
