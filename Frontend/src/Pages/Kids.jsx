import React from 'react';
import './Kids.css';
import Orb from "../Components/Backgrounds/Orb"

export default function Kids() {
    return (
        <div className="kids-container page">
            <Orb
                hoverIntensity={0.1}
                rotateOnHover
                hue={0}
                forceHoverState={false}
                backgroundColor="#000000"
            />
            <div className='content'>
                <h1>Kids Page</h1>
            </div>
            
        </div>
    );
}
