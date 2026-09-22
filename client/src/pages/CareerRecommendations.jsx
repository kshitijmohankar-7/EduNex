import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function offlineCareer(goal, skills) {
  const skillList = String(skills || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const role = goal || 'Software Developer';

  return `## Practical career plan

**Target:** ${role}

### Suitable roles
- Software Developer
- Full-Stack Developer
- Backend Developer

### Skills to learn next
- Data Structures & Algorithms
- REST APIs, authentication and database design
- Git, testing and deployment

### Project ideas
1. Build and deploy a full-stack project with PostgreSQL.
2. Add authentication, role-based access and REST APIs to a portfolio project.
3. Build one DSA-focused project or coding practice tracker.

**Current skills:** ${skillList.join(', ') || 'Add your current skills above.'}

> Gemini is temporarily unavailable, so EduNex generated this practical offline roadmap from your inputs.`;
}

export default function CareerRecommendations() {
  const { user } = useAuth();
  const [skills, setSkills] = useState('Java, React, SQL');
  const [goal, setGoal] = useState('Software Developer');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);

    try {
      const response = await api.chat(
        `Give concise career recommendations for a college student. Goal: ${goal}. Skills: ${skills}. Return 3 suitable roles, 3 skills to learn next, and 3 project ideas.`
      );

      if (
        !response?.reply ||
        (response.model_status && response.model_status !== 'ok')
      ) {
        throw new Error('AI fallback');
      }

      setResult(response.reply);
    } catch (error) {
      setResult(offlineCareer(goal, skills));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="dashboard-kicker">AI Career</span>
          <h1>Career Recommendations</h1>
          <p>
            Use your skills and target role to get a practical next-step plan.
          </p>
        </div>
      </div>

      <section className="panel tool-form">
        <label>
          Target role
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </label>

        <label>
          Current skills
          <textarea
            rows="3"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
          />
        </label>

        <button className="btn" onClick={generate} disabled={loading}>
          {loading ? 'Analyzing...' : 'Get recommendations'}
        </button>
      </section>

      {result && (
        <section className="panel tool-output">
          <span className="dashboard-kicker">AI Recommendation</span>
          <div style={{ whiteSpace: 'pre-wrap' }}>{result}</div>
        </section>
      )}
    </div>
  );
}
