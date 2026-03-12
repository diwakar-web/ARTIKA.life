import React from 'react';
import './UserDashBoard.css';
import Orb from "../Components/Backgrounds/Orb"

export default function UserDashBoard() {
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
                <h1>UserDashBoard Page</h1>
            </div>
            
        </div>
    );
}
