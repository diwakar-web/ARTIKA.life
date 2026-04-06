// Local medical dataset for simple RAG
const medicalDataset = [
  "Paracetamol is used to treat mild to moderate pain and reduce fever.",
  "Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID) used to relieve pain, fever, and inflammation.",
  "A normal body temperature is typically around 98.6°F (37°C), but it can vary.",
  "To relieve a mild headache, drink plenty of water, rest in a quiet room, and take an over-the-counter pain reliever if needed.",
  "Common cold symptoms include a runny nose, sore throat, cough, congestion, and mild body aches.",
  "High blood pressure (hypertension) usually has no symptoms but can lead to heart disease and stroke.",
  "A balanced diet, regular exercise, and adequate sleep are fundamental for maintaining good health.",
  "Cough syrups containing dextromethorphan are used to treat a dry cough.",
  "Antibiotics are used to treat bacterial infections, not viral infections like the common cold or flu.",
  "If you have chest pain, difficulty breathing, or severe bleeding, seek emergency medical care immediately."
];

function retrieveContext(query) {
  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return [];

  const scoredDocs = medicalDataset.map(doc => {
    let score = 0;
    const docLower = doc.toLowerCase();
    for (const w of words) {
      if (docLower.includes(w)) {
        score++;
      }
    }
    return { doc, score };
  });

  const topDocs = scoredDocs
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(d => d.doc);

  return topDocs;
}

module.exports = { retrieveContext };
