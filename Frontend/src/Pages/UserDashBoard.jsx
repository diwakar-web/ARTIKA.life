import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./UserDashBoard.css";
import Header from "../Components/FixedComponents/Header";
import Orb from "../Components/Backgrounds/Orb";
import { auth, onAuthStateChanged } from "../firebase";

const API_BASE = import.meta.env.VITE_API_URL;

export default function UserDashBoard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const [tMsgVisible, setTMsgVisible] = useState(!!location.state?.showTelegramMessage);
  const activationCode = location.state?.activationCode;

  useEffect(() => {
    if (tMsgVisible) {
      const timer = setTimeout(() => {
        setTMsgVisible(false);
      }, 20000); // hide after 20 seconds
      return () => clearTimeout(timer);
    }
  }, [tMsgVisible]);

  // 1. Get logged-in user's email from Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email || "");
      } else {
        setCurrentUserEmail("");
        setMembers([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const [remindersCount, setRemindersCount] = useState({});

  // 2. Fetch members from MongoDB whenever we know the user's email
  useEffect(() => {
    if (!currentUserEmail) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/members?userEmail=${encodeURIComponent(currentUserEmail)}&t=${Date.now()}`
        );
        const json = await res.json();
        if (json.success) {
          const loadedMembers = json.data;
          setMembers(loadedMembers);

          // Fetch reminder counts based on actual prescribed times
          const promises = loadedMembers.map(async (m) => {
            try {
              const rRes = await fetch(`${API_BASE}/api/reminders/member/${m._id}?t=${Date.now()}`);
              const rJson = await rRes.json();
              if (rJson.success) {
                // Sum the actual number of overall reminder times across all medications (Days * Times per day)
                const totalTimes = rJson.data.reduce((acc, curr) => {
                  const timesPerDay = curr.times && Array.isArray(curr.times) ? curr.times.length : 0;
                  const days = curr.duration ? parseInt(curr.duration) || 1 : 1;
                  const total = (timesPerDay * days) - (curr.dosesTaken || 0);
                  return acc + (total > 0 ? total : 0);
                }, 0);
                
                return { id: m._id, count: totalTimes };
              }
            } catch (e) {
              console.error("Reminder fetch error:", e);
            }
            return { id: m._id, count: 0 };
          });
          
          const counts = await Promise.all(promises);
          const countMap = {};
          counts.forEach(c => { countMap[c.id] = c.count; });
          setRemindersCount(countMap);
        }
        else console.error("Failed to load members:", json.message);
      } catch (err) {
        console.error("Network error fetching members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [currentUserEmail]);


  // 3. Delete via API, then remove from local state
  const deleteMember = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/members/${id}?userEmail=${encodeURIComponent(currentUserEmail)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        setMembers((prev) => prev.filter((m) => m._id !== id));
      } else {
        alert("Delete failed: " + json.message);
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  // 4. Navigate to edit page – pass the full member object (uses _id for PUT)
  const updateMember = (member) => {
    navigate("/add", { state: { member } });
  };

  const adults = members.filter((m) => m.category === "Adult");
  const kids   = members.filter((m) => m.category === "Kid" || m.category === "Newborn");

  const MemberCard = ({ member }) => (
    <div className="member-card" key={member._id}>
      <div className="card-id">ID: {member._id?.slice(-6).toUpperCase()}</div>
      <div
        className="card-photo"
        style={{ backgroundImage: `url(${member.photoLink})` }}
      >
        {!member.photoLink && "👤"}
      </div>
      <div className="card-info">
        <h3>{member.name}</h3>
        <div className="card-badge">{member.relation}</div>
        <div className="card-details">
          <p>
            <strong>Age:</strong> {member.age} yrs ({member.category})
          </p>
          <div className="reminders-badge" style={{ 
            marginTop: "8px", 
            marginBottom: "4px",
            background: "rgba(99, 102, 241, 0.15)", 
            padding: "4px 8px", 
            borderRadius: "6px",
            fontSize: "0.80rem",
            color: "#a5b4fc",
            display: "inline-block",
            border: "1px solid rgba(99, 102, 241, 0.3)"
          }}>
            💊 Active Reminders: <strong>{remindersCount[member._id] || 0}</strong>
          </div>
          {/* Growth Centre Info for Kids */}
          {(member.category === "Kid" || member.category === "Newborn") &&
            member.growthData &&
            (member.growthData.weight ||
              member.growthData.height ||
              member.growthData.bloodGroup ||
              member.growthData.allergies) && (
              <div className="growth-info">
                <p className="growth-info-title">🌱 Growth Centre</p>
                {member.growthData.weight && (
                  <p><strong>Weight:</strong> {member.growthData.weight} kg</p>
                )}
                {member.growthData.height && (
                  <p><strong>Height:</strong> {member.growthData.height} cm</p>
                )}
                {member.growthData.bloodGroup && (
                  <p><strong>Blood Group:</strong> {member.growthData.bloodGroup}</p>
                )}
                {member.growthData.allergies && (
                  <p><strong>Allergies:</strong> {member.growthData.allergies}</p>
                )}
              </div>
            )}
        </div>
      </div>
      <div className="card-actions">
        <button className="edit-btn" onClick={() => updateMember(member)}>
          Update
        </button>
        {/* Tracker Button for Newborns */}
        {member.category === "Newborn" && (
          <button
            className="tracker-btn"
            onClick={() => navigate("/vaccine", { state: { member } })}
          >
            Tracker
          </button>
        )}
        <button
            className="tracker-btn locker-btn"
            onClick={() => navigate("/hl", { state: { member } })}
          >
            Locker
        </button>
        <button className="del-btn" onClick={() => deleteMember(member._id)}>
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container page">
      <Orb
        hoverIntensity={0.1}
        rotateOnHover
        hue={220}
        forceHoverState={false}
        backgroundColor="#03080f"
      />

      <Header />

      <div className="content">
        <div className="dashboard-header">
          <h1>Family Members</h1>
          <div className="button-row">
            <button className="add-btn" onClick={() => navigate("/add")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V14M2 8H14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              Add New Member
            </button>
          </div>
        </div>

        {tMsgVisible && activationCode && (
          <div style={{ background: "rgba(99, 102, 241, 0.2)", border: "1px solid #6366f1", padding: "15px", borderRadius: "8px", margin: "10px 0 20px 0", textAlign: "center", color: "#fff" }}>
            <h3 style={{ margin: "0 0 5px 0", color: "#a5b4fc" }}>Link Telegram for Notifications</h3>
            <p style={{ margin: 0 }}>
              Go to our Telegram bot <a href="https://t.me/Artikalife_bot" target="_blank" rel="noopener noreferrer" style={{color: "#fff", textDecoration: "underline"}}>@Artikalife_bot</a> and send the following activation command:
              <br/>
              <strong style={{ fontSize: "1.2rem", background: "rgba(0,0,0,0.5)", padding: "5px 10px", borderRadius: "4px", display: "inline-block", marginTop: "10px", letterSpacing: "1px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)" }} title="Copy to clipboard" onClick={() => {navigator.clipboard.writeText('/start ' + activationCode); alert('Copied to clipboard!')}}>/start {activationCode} 📋</strong>
            </p>
          </div>
        )}

        {loading ? (
          <div className="no-members"><p>Loading members…</p></div>
        ) : !currentUserEmail ? (
          <div className="no-members"><p>Please log in to view your family members.</p></div>
        ) : members.length === 0 ? (
          <div className="no-members">
            <p>No family members added yet.</p>
          </div>
        ) : (
          <div className="dashboard-sections">
            {/* ── Adults Section ── */}
            <div className="section-panel">
              <div className="section-heading adults-heading">
                <h2>Adults</h2>
                <span className="section-count">{adults.length}</span>
              </div>
              <div className="member-grid adults-grid">
                {adults.length > 0 ? (
                  adults.map((member) => (
                    <MemberCard key={member._id} member={member} />
                  ))
                ) : (
                  <div className="section-empty">No adults added yet.</div>
                )}
              </div>
            </div>

            {/* ── Kids Section ── */}
            <div className="section-panel">
              <div className="section-heading kids-heading">
                <h2>Kids &amp; Newborns</h2>
                <span className="section-count kids-count">{kids.length}</span>
              </div>
              <div className="member-grid kids-grid">
                {kids.length > 0 ? (
                  kids.map((member) => (
                    <MemberCard key={member._id} member={member} />
                  ))
                ) : (
                  <div className="section-empty">No kids added yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
