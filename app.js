const jobsGrid = document.getElementById('jobs-grid');
const roleSelect = document.getElementById('roleSelect');
const roleCount = document.getElementById('role-count');
const form = document.getElementById('applicationForm');
const message = document.getElementById('formMessage');
const applicationsList = document.getElementById('applicationsList');

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function renderJobs(jobs) {
  roleCount.textContent = String(jobs.length);
  jobsGrid.innerHTML = jobs
    .map(
      job => `
        <article class="job-card">
          <span class="chip">${job.team}</span>
          <h3>${job.title}</h3>
          <div class="job-meta">
            <span>${job.location}</span>
            <span>•</span>
            <span>${job.type}</span>
            <span>•</span>
            <span>${job.salary}</span>
          </div>
          <p>${job.summary}</p>
          <div class="skill-row">
            ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        </article>
      `
    )
    .join('');

  roleSelect.innerHTML = [
    '<option value="">Choose a role</option>',
    ...jobs.map(job => `<option value="${job.title}">${job.title}</option>`)
  ].join('');
}

function renderApplications(applications) {
  if (!applications.length) {
    applicationsList.innerHTML = '<div class="application-item"><h3>No applications yet</h3><p>Submitted applications will appear here as soon as candidates use the form.</p></div>';
    return;
  }

  applicationsList.innerHTML = applications
    .slice(0, 6)
    .map(
      application => `
        <article class="application-item">
          <span class="badge">${application.status}</span>
          <h3>${application.fullName}</h3>
          <p>
            ${application.role}
            <br />
            ${application.email}
            <br />
            ${formatDate(application.createdAt)}
          </p>
        </article>
      `
    )
    .join('');
}

async function loadData() {
  const [jobsResponse, applicationsResponse] = await Promise.all([
    fetch('/api/jobs'),
    fetch('/api/applications')
  ]);

  const jobsData = await jobsResponse.json();
  const applicationsData = await applicationsResponse.json();

  renderJobs(jobsData.jobs || []);
  renderApplications(applicationsData.applications || []);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = 'Submitting your application...';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Submission failed.');
    }

    message.textContent = 'Application submitted successfully. Your information is now stored in the backend.';
    form.reset();
    await loadData();
  } catch (error) {
    message.textContent = error.message;
  }
});

loadData().catch(error => {
  message.textContent = `Unable to load portal data: ${error.message}`;
});
