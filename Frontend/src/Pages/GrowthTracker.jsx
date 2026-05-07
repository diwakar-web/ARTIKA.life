import React, { useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { User, Download, FileText, Activity, Heart, Moon, Utensils } from 'lucide-react';
import './GrowthTracker.css';
import DarkVeil from "../Components/Backgrounds/DarkVeil";
import Header from "../Components/FixedComponents/Header";
import logo from "../Assets/Dark-removebg-preview.png";

// WHO Standard Data (Simplified)
const WHO_DATA = {
  bmi: [
    { age: 0, median: 13.5 }, { age: 2, median: 16.5 }, { age: 5, median: 15.3 },
    { age: 8, median: 15.8 }, { age: 10, median: 16.6 }, { age: 12, median: 18.0 },
    { age: 14, median: 19.5 }, { age: 16, median: 21.0 }, { age: 18, median: 22.5 },
  ],
  sleep: (age) => {
    if (age <= 2) return 12.5; // 11-14
    if (age <= 5) return 11.5; // 10-13
    if (age <= 12) return 10.5; // 9-12
    return 9; // 8-10
  },
  meals: 5, // 3 meals + 2 snacks
  activity: 60, // 60 mins daily
};

export default function GrowthTracker() {
  const location = useLocation();
  const navigate = useNavigate();
  const member = location.state?.member;
  const reportRef = useRef(null);

  const extractNumber = (str) => {
    if (!str) return 0;
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const bmi = useMemo(() => {
    if (!member?.growthData?.weight || !member?.growthData?.height) return null;
    const hMeter = member.growthData.height / 100;
    return (member.growthData.weight / (hMeter * hMeter)).toFixed(1);
  }, [member]);

  const getBmiColor = (val) => {
    const b = parseFloat(val);
    if (!b) return '#888';
    if (b < 18.5 || (b > 25 && b <= 30)) return '#ffa502'; // Orange (Under/Over)
    if (b > 18.5 && b <= 25) return '#2ed573'; // Green (Healthy)
    return '#ff4757'; // Red (Obese)
  };

  const getScoreColor = (s) => {
    if (s >= 90) return '#2ed573';
    if (s >= 70) return '#ffa502';
    return '#ff4757';
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current || !member) return;
    
    const card = reportRef.current;
    
    // Capture canvas while hiding the action buttons
    const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#03080f',
        onclone: (clonedDoc) => {
            const buttons = clonedDoc.querySelector('.action-row');
            if (buttons) buttons.style.display = 'none';
            
            // Show the branding in the PDF
            const branding = clonedDoc.querySelector('.report-branding');
            if (branding) branding.style.setProperty('display', 'flex', 'important');
            
            const clonedCard = clonedDoc.querySelector('.growth-card');
            if (clonedCard) clonedCard.style.padding = '50px';
        }
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate aspect ratio to fit perfectly on A4
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // If image is taller than A4, scale it down
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    
    if (finalHeight > pdfHeight) {
        finalHeight = pdfHeight;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
    }
    
    // Center the image on the A4 page
    const xOffset = (pdfWidth - finalWidth) / 2;
    
    pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);
    pdf.save(`${member.name}_Growth_Report.pdf`);
  };

  // ── Chart Data Preparation ──────────────  // 1. BMI Line Chart Data (Blue WHO, Red Kid)
  const bmiChartData = useMemo(() => {
    let data = [...WHO_DATA.bmi];
    const childAge = member?.age || 0;
    const childBmiVal = parseFloat(bmi);
    
    // Ensure child's age is in the set for the line to have a point
    if (!data.find(d => d.age === childAge)) {
        data.push({ age: childAge, median: WHO_DATA.bmi.find(d => d.age > childAge)?.median || 22 });
        data.sort((a, b) => a.age - b.age);
    }
    
    return data.map(d => ({
      ...d,
      whoMedian: d.median,
      childBmi: d.age === childAge ? childBmiVal : null
    }));
  }, [member, bmi]);

  // 2. Specialized Data for Sleep, Meals, Activities
  const sleepData = useMemo(() => {
    const actual = extractNumber(member?.growthData?.sleepTime);
    const target = WHO_DATA.sleep(member?.age || 10);
    return [
      { name: 'Sleep (Hrs)', actual, target }
    ];
  }, [member]);

  const mealData = useMemo(() => {
    const actual = extractNumber(member?.growthData?.foodIntake) || 3;
    const target = 5;
    return [
      { name: 'Meals (Qty)', actual, target }
    ];
  }, [member]);

  const activityPieData = useMemo(() => {
    let actual = extractNumber(member?.growthData?.activity);
    if (member?.growthData?.activity?.toLowerCase().includes('hour')) actual *= 60;
    const target = 60;

    if (actual >= target) {
        return [
            { name: 'WHO Target', value: target, fill: '#007bff' },
            { name: 'Extra Activity', value: actual - target, fill: '#ff4d4d' },
        ];
    } else {
        return [
            { name: 'Actual Activity', value: actual, fill: '#ff4d4d' },
            { name: 'Target Gap', value: target - actual, fill: '#007bff', opacity: 0.2 },
        ];
    }
  }, [member]);

  const healthScore = useMemo(() => {
    if (!member || !member.growthData) return 0;
    let score = 0;
    const { sleepTime, foodIntake, activity } = member.growthData;

    if (bmi) {
      const b = parseFloat(bmi);
      if (b >= 18.5 && b <= 25) score += 40;
      else if (b >= 17 && b < 18.5) score += 30;
      else score += 15;
    }

    if (extractNumber(activity) >= 1) score += 20;
    if (extractNumber(sleepTime) >= 8) score += 20;
    if (foodIntake) score += 20;

    return score;
  }, [member, bmi]);

  if (!member) {
    return (
      <div className="growth-tracker-container page">
        <DarkVeil speed={1} />
        <Header />
        <div className='content'>
          <div className="no-member-alert">
            <h2>No Member Selected</h2>
            <button onClick={() => navigate('/user')} className="back-btn">Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="growth-tracker-container page">
      <DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={1} scanlineFrequency={0} warpAmount={0} />
      <Header />
      <div className='content'>
        <div className="growth-card full-screen-card" ref={reportRef}>
          
          <div className="report-branding">
            <img src={logo} alt="Artika Logo" className="report-logo" />
            <div className="report-title">Child Growth & Health Report</div>
          </div>
          
          <div className="member-header">
            <div className="member-photo" style={{ backgroundImage: `url(${member.photoLink})` }}>
              {!member.photoLink && <User size={30} color="#888" />}
            </div>
            <div className="member-basic-info">
              <h1>{member.name}</h1>
              <span className="relation-badge">{member.relation} • {member.age} yrs</span>
            </div>
            <div className="bmi-pill" style={{ borderColor: getBmiColor(bmi), color: getBmiColor(bmi) }}>
              <span className="bmi-val" style={{ color: getBmiColor(bmi) }}>{bmi || '--'}</span>
              <span className="bmi-lbl">BMI</span>
            </div>
          </div>

          <div className="charts-main-grid">
            {/* 1. BMI Linear Comparison (WHO Blue, Kid Red) */}
            <div className="chart-wrapper bmi-comparison">
              <h3><Heart size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> BMI Linear Comparison</h3>
              <div className="chart-container-large">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={bmiChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="age" stroke="#888" fontSize={10} />
                    <YAxis stroke="#888" fontSize={10} domain={[10, 30]} />
                    <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid #007bff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="whoMedian" name="WHO Standard (Blue)" stroke="#007bff" strokeWidth={3} dot={false} />
                    <Bar dataKey="childBmi" name="Child Actual (Red)" barSize={15} fill="#ff4757" radius={[10, 10, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Sleep Bar Chart (Converted to Vertical Bar) */}
            <div className="chart-wrapper lifestyle-box">
              <h3><Moon size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Sleep Comparison (Hrs)</h3>
              <div className="chart-container-small">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sleepData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#888" fontSize={12} domain={[0, 15]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target" name="WHO suggested (Blue)" fill="#007bff" radius={[5, 5, 0, 0]} barSize={30} />
                    <Bar dataKey="actual" name="Child Sleep (Red)" fill="#ff4757" radius={[5, 5, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Meals Bar Chart (Still Horizontal as per user '1 barh to bar' request) */}
            <div className="chart-wrapper lifestyle-box">
              <h3><Utensils size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Meals Consumed vs Standards</h3>
              <div className="chart-container-small">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={mealData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <XAxis type="number" hide domain={[0, 8]} />
                    <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target" name="WHO Target (Blue)" fill="#007bff" radius={[0, 5, 5, 0]} barSize={20} />
                    <Bar dataKey="actual" name="Child Meals (Red)" fill="#ff4757" radius={[0, 5, 5, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Outdoor Activities Pie Chart */}
            <div className="chart-wrapper lifestyle-box">
              <h3><Activity size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Outdoor Activities</h3>
              <div className="chart-container-small pie-container">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={activityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {activityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={entry.opacity || 1} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-label-center">
                    <span className="plc-val">{extractNumber(member.growthData.activity)}m</span>
                    <span className="plc-lbl">Activity</span>
                </div>
              </div>
            </div>
          </div>

          <div className="raw-details-banner">
            <div className="rb-item"><strong>Weight:</strong> {member.growthData?.weight}kg</div>
            <div className="rb-item"><strong>Height:</strong> {member.growthData?.height}cm</div>
            <div className="rb-item"><strong>Sleep:</strong> {member.growthData?.sleepTime}h</div>
            <div className="rb-item"><strong>Activity:</strong> {member.growthData?.activity}</div>
            <div className="rb-item"><strong>Nutrition:</strong> {member.growthData?.foodIntake} meals</div>
          </div>

          <div className="health-score-container" style={{ borderColor: getScoreColor(healthScore) }}>
            <div className="hs-left">
              <h3>Health Score</h3>
              <p>Overall wellness based on current metrics.</p>
            </div>
            <div className="hs-right">
              <div className="score-circle">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" style={{ stroke: getScoreColor(healthScore) }} strokeDasharray={`${healthScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" className="percentage">{healthScore}</text>
                </svg>
              </div>
            </div>
          </div>

          <div className="score-ribbon">
            <div className="ribbon-item green"><span>Excellent</span> Above 90</div>
            <div className="ribbon-item orange"><span>Good</span> Above 70</div>
            <div className="ribbon-item red"><span>Critical</span> Below 70</div>
          </div>

          <div className="action-row">
            <button className="btn-secondary download-btn" onClick={handleDownloadReport}>
              <Download size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Download PDF Report
            </button>
            <button className="btn-primary" onClick={() => navigate('/add', { state: { member } })}>
              <FileText size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} /> Update Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
