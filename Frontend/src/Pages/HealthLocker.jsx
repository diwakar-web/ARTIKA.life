import React, { useState } from "react";
import "./HealthLocker.css";
import DotGrid from "../Components/Backgrounds/DotGrid";
import Header from "../Components/FixedComponents/Header";
import Footer from "../Components/FixedComponents/Footer";
export default function HealthLocker() {

  const [docs, setDocs] = useState({
    prescription: [],
    lab: [],
    insurance: []
  });

  const [preview, setPreview] = useState(null);

  const uploadFile = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const newDoc = {
      name: file.name,
      file: URL.createObjectURL(file)
    };

    setDocs(prev => ({
      ...prev,
      [type]: [...prev[type], newDoc]
    }));
  };

  const deleteDoc = (type, index) => {
    const updated = [...docs[type]];
    updated.splice(index, 1);

    setDocs({
      ...docs,
      [type]: updated
    });
  };

  const downloadDoc = (doc) => {
    const link = document.createElement("a");
    link.href = doc.file;
    link.download = doc.name;
    link.click();
  };

  const Section = ({ title, type }) => (
    <>
      <div className="section-title">
        {title}
        <span>▼</span>
      </div>

      <div className="section-box">

        <label className="upload-bar">
          + UPLOAD NEW DOCUMENT
          <input
            type="file"
            hidden
            onChange={(e) => uploadFile(e, type)}
          />
        </label>

        {docs[type].map((doc, i) => (
          <div
            className="doc-row"
            key={i}
            onClick={() => setPreview(doc.file)}
          >

            <span>{doc.name}</span>

            <div className="buttons">

              <button
                className="download"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadDoc(doc);
                }}
              >
                DOWNLOAD
              </button>

              <button
                className="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDoc(type, i);
                }}
              >
                DELETE
              </button>

            </div>

          </div>
        ))}

      </div>
    </>
  );

  return (
    <div className="healthlocker-container page">

      <DotGrid
        dotSize={7}
        gap={15}
        baseColor="#271E37"
        activeColor="#5227FF"
        proximity={120}
        shockRadius={250}
        shockStrength={5}
        resistance={750}
        returnDuration={1.5}
      />

      <div className="content">
<Header/>
        <div className="header-space"></div>

        <Section title="PRESCRIPTION" type="prescription" />
        <Section title="LAB REPORTS" type="lab" />
        <Section title="INSURANCE DOCUMENTS" type="insurance" />
<Footer/>
      </div>

      {preview && (
        <div className="preview-modal">

          <div className="preview-content">

            <button
              className="close-preview"
              onClick={() => setPreview(null)}
            >
              ✕
            </button>

            <iframe
              src={preview}
              title="Document Preview"
              width="100%"
              height="100%"
            ></iframe>

          </div>

        </div>
      )}

    </div>
  );
}