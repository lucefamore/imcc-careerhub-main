window.IMCCCareerHub = window.IMCCCareerHub || {};

// Aggregates all program-specific job arrays
const allJobs = [
  ...(window.jobsIT || []),
  ...(window.jobsBusiness || []),
  ...(window.jobsHealthcare || []),
  ...(window.jobsEducation || []),
  ...(window.jobsCCJE || []),
  ...(window.jobsCHTM || []),
  ...(window.jobsSocialWork || [])
];

function filterAndRenderJobs(searchTerm = '', categoryFilter = 'all') {
  const container = document.getElementById('jobs-container');
  if (!container) return;

  const filtered = allJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="no-results">No job listings found matching your criteria.</div>`;
    return;
  }

  container.innerHTML = filtered.map(job => `
    <div class="job-card" data-id="${job.id}">
      <h3>${job.title}</h3>
      <p class="company">${job.company} - <span>${job.department}</span></p>
      <p class="description">${job.description}</p>
      <div class="tags">
        ${job.skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
      </div>
      <button onclick="requestAIRecommendation('${job.id}')" class="btn-recommend">Check Match via AI</button>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  filterAndRenderJobs();
});
