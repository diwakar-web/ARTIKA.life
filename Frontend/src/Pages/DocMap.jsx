// src/Pages/DocMap.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Header from "../Components/FixedComponents/Header";
import Footer from "../Components/FixedComponents/Footer";
import "./DocMap.css";
export default function DocMap() {
  const [iframeSrc, setIframeSrc] = useState("");
  const [doctorType, setDoctorType] = useState("");
  const [pincode, setPincode] = useState("");
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;  // Replace with your actual Google Maps Embed API key
  // read query params
  const { search } = useLocation();
  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const initialSpecialty = params.get("specialty") || "";
  const initialPincode = params.get("pincode") || "";

  // flag so we auto-search only once for a specialty passed via URL
  const autoSearched = useRef(false);

  // Register page instructions for the header TTS

  // show current location map helper (keeps same semantics as earlier)
  const showCurrentLocationMap = (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setIframeSrc(
      `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat},${lng}&zoom=14&maptype=roadmap`
    );
  };

  const showError = () => {
    setIframeSrc("");
    console.warn("Unable to access location. Please allow location access or try again.");
  };

  // original showMap logic extracted to a function we can call both manually and automatically
  const showMap = () => {
    if (!doctorType) {
      alert("Please select a specialization.");
      return;
    }

    if (pincode) {
      const query = encodeURIComponent(`${doctorType} in ${pincode}`);
      setIframeSrc(`https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${query}`);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const query = encodeURIComponent(doctorType);
          setIframeSrc(
            `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${query}&center=${lat},${lng}&zoom=14`
          );
        },
        () => {
          // If geolocation fails, notify once (only if user attempted an auto-search),
          // otherwise prefer silent fallback to pincode entry.
          alert("Unable to access location. Please enter a pincode instead.");
        }
      );
    } else {
      alert("Geolocation not supported. Please enter a pincode.");
    }
  };

  // On mount: if location available, show current location view (same as before)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showCurrentLocationMap, showError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When URL provides specialty or pincode, prefill the inputs
  useEffect(() => {
    if (initialSpecialty) setDoctorType(initialSpecialty);
    if (initialPincode) setPincode(initialPincode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpecialty, initialPincode]);

  // If a specialty was passed in URL, auto-run search once after doctorType is set
  useEffect(() => {
    // only auto-search when there is an initial specialy param and we haven't auto-searched yet
    if (!autoSearched.current && initialSpecialty) {
      // ensure doctorType is populated (may be set in previous effect)
      if (doctorType && doctorType.trim() !== "") {
        // mark so we don't repeat
        autoSearched.current = true;
        // small timeout to allow UI to settle (not required but smoother)
        setTimeout(() => {
          showMap();
        }, 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorType, initialSpecialty]);

  return (
    <>
      <Header />
      <main>
        <div className="find-doctor-container">
          <h2>🩺 Find Medical Experts</h2>

          <div className="search-section" role="region" aria-label="Find doctors">
            <label htmlFor="doctorType" className="sr-only">Select Specialization</label>
            <select
              id="doctorType"
              value={doctorType}
              onChange={(e) => setDoctorType(e.target.value)}
              aria-label="Select specialization"
            >
              <option value="">Select Specialization</option>
              <option value="Allergist">Allergist</option>
              <option value="Andrologist">Andrologist</option>
              <option value="Anesthesiologist">Anesthesiologist</option>
              <option value="Audiologist">Audiologist</option>
              <option value="Cardiologist">Cardiologist</option>
              <option value="Cosmetologist">Cosmetologist</option>
              <option value="Dentist">Dentist</option>
              <option value="Dermatologist">Dermatologist</option>
              <option value="Endocrinologist">Endocrinologist</option>
              <option value="ENT Specialist (Otolaryngologist)">ENT Specialist (Otolaryngologist)</option>
              <option value="Family Physician">Family Physician</option>
              <option value="Gastroenterologist">Gastroenterologist</option>
              <option value="General Physician">General Physician</option>
              <option value="General Surgeon">General Surgeon</option>
              <option value="Geriatrician">Geriatrician</option>
              <option value="Gynecologist">Gynecologist</option>
              <option value="Hematologist">Hematologist</option>
              <option value="Hepatologist">Hepatologist</option>
              <option value="Immunologist">Immunologist</option>
              <option value="Infectious Disease Specialist">Infectious Disease Specialist</option>
              <option value="Internal Medicine Specialist">Internal Medicine Specialist</option>
              <option value="Laparoscopic Surgeon">Laparoscopic Surgeon</option>
              <option value="Microbiologist">Microbiologist</option>
              <option value="Neonatologist">Neonatologist</option>
              <option value="Nephrologist">Nephrologist</option>
              <option value="Neurologist">Neurologist</option>
              <option value="Neurosurgeon">Neurosurgeon</option>
              <option value="Obstetrician">Obstetrician</option>
              <option value="Oncologist">Oncologist</option>
              <option value="Ophthalmologist">Ophthalmologist</option>
              <option value="Optometrist">Optometrist</option>
              <option value="Oral Surgeon">Oral Surgeon</option>
              <option value="Orthodontist">Orthodontist</option>
              <option value="Orthopedist">Orthopedist</option>
              <option value="Palliative Care Specialist">Palliative Care Specialist</option>
              <option value="Pathologist">Pathologist</option>
              <option value="Pediatrician">Pediatrician</option>
              <option value="Periodontist">Periodontist</option>
              <option value="Physiotherapist">Physiotherapist</option>
              <option value="Plastic Surgeon">Plastic Surgeon</option>
              <option value="Psychiatrist">Psychiatrist</option>
              <option value="Psychologist">Psychologist</option>
              <option value="Pulmonologist">Pulmonologist</option>
              <option value="Radiologist">Radiologist</option>
              <option value="Rheumatologist">Rheumatologist</option>
              <option value="Sports Medicine Specialist">Sports Medicine Specialist</option>
              <option value="Surgeon (General)">Surgeon (General)</option>
              <option value="Transplant Surgeon">Transplant Surgeon</option>
              <option value="Trauma / Emergency Medicine Specialist">Trauma / Emergency Medicine Specialist</option>
              <option value="Urologist">Urologist</option>
              <option value="Vascular Surgeon">Vascular Surgeon</option>
            </select>

            <label htmlFor="pincode" className="sr-only">Enter pincode</label>
            <input
              type="text"
              id="pincode"
              placeholder="Enter Pincode (optional)"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              aria-label="Enter pincode"
            />

            <button className="click" onClick={showMap} aria-label="Search doctors">
              Search
            </button>
          </div>

          <div id="map" aria-live="polite" style={{ marginTop: 16 }}>
            {iframeSrc ? (
              <iframe
                title="map"
                width="100%"
                height="450"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={iframeSrc}
              ></iframe>
            ) : (
              <p className="map-message">Map will appear here. Allow location access or enter a pincode and press Search.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
