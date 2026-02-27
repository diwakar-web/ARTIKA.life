import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">

      {/* TOP GRID SECTION */}
      <div className="footer-grid">

        {/* ELEMENT 1 */}
        <div className="footer-element navigate">
          <h4>Navigate</h4>
          <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#">Care</a></li>
            <li><a href="#">Reminder</a></li>
            <li><a href="#">Kids</a></li>
            <li><a href="#">Health Locker</a></li>
            <li><a href="#">Login</a></li>
          </ul>
        </div>

        {/* ELEMENT 2 */}
        <div className="footer-element social">
          <h4>Social</h4>
          <ul>
            <li><a href="#">Linkedin</a></li>
            <li><a href="#">Twitter</a></li>
            <li><a href="#">Facebook</a></li>
            <li><a href="#">YouTube</a></li>
          </ul>
        </div>

        {/* ELEMENT 3 */}
        <div className="footer-element contact">
          <h4>Contact Us</h4>
          <p>+91 - 99062-51573</p>
          <p>artika.life@gmail.com</p>
        </div>

      </div>

      {/* SEPARATE BRAND SECTION */}
      <div className="footer-brand">
        <h1>
          <span className="brand-white">ARTIKA</span>
          <span className="brand-pink">.LIFE</span>
        </h1>
        <p>Health, simplified for every family.</p>
      </div>

    </footer>
  );
}