import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Training Data Tags - Exercism',
  description: 'Tag code samples to help train Exercism\'s neural network',
}

export default function TrainingDataPage() {
  return (
    <div className="training-data-page">
      <div className="content">
        <h1>Training Data Dashboard</h1>
        <p>Help improve Exercism by tagging code samples for our machine learning models.</p>
        
        <div className="dashboard-content">
          <div className="stats-section">
            <div className="stat-card">
              <h3>Samples Tagged</h3>
              <div className="stat-number">1,247</div>
            </div>
            <div className="stat-card">
              <h3>Pending Review</h3>
              <div className="stat-number">89</div>
            </div>
            <div className="stat-card">
              <h3>Your Accuracy</h3>
              <div className="stat-number">94%</div>
            </div>
          </div>
          
          <div className="tagging-section">
            <h2>Available for Tagging</h2>
            <p>No training data samples available at the moment.</p>
          </div>
        </div>
      </div>
    </div>
  )
}