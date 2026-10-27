function normalizeJob(job, fallbackCategory, fallbackLabel) {
    const title = job && job.title ? job.title : 'Untitled Position';
    return {
        title: title,
        company: job && job.company ? job.company : '',
        location: job && job.location ? job.location : '',
        employmentType: job && (job.employmentType || job.employment_type) ? (job.employmentType || job.employment_type) : '',
        tag: job && job.tag ? job.tag : (fallbackLabel || fallbackCategory || 'General'),
        url: job && job.url ? job.url : '',
        description: job && job.description ? job.description : '',
        skills: Array.isArray(job && job.skills)
            ? job.skills
            : (job && typeof job.skills === 'string' ? job.skills.split(',').map(function(skill) { return skill.trim(); }).filter(Boolean) : [])
    };
}

// NOTE: getRenderableJobCategories() is defined once, in index.html's inline
// script, so admin/Supabase-loaded jobs and the local seed files share one
// merge + de-duplication path instead of two silently conflicting copies.

function renderJobs() {
    let container = document.getElementById('jobContainer');
    if (!container) return;
    container.innerHTML = '';

    const categories = typeof getRenderableJobCategories === 'function'
        ? getRenderableJobCategories()
        : (Array.isArray(window.jobCategories) ? window.jobCategories : []);
    if (!categories.length) return;

    function safeText(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function bookmarkKey(job) {
        return [job.title, job.company, job.url].join('|').toLowerCase();
    }

    function getBookmarkedJobs() {
        try {
            const saved = JSON.parse(localStorage.getItem('imcc_bookmarked_jobs') || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.warn('Saved job bookmarks could not be read:', error.message);
            return [];
        }
    }

    function updateDirectoryStats(allJobs) {
        const savedKeys = new Set(allJobs.map(function(item) {
            return bookmarkKey(item.job);
        }));
        const saved = getBookmarkedJobs().filter(function(key) {
            return savedKeys.has(key);
        });
        const categoriesCount = new Set(categories.filter(function(group) {
            return group.jobs.length;
        }).map(function(group) {
            return group.category;
        })).size;
        const directLinks = allJobs.filter(function(item) {
            return /^https:\/\//i.test(item.job.url || '');
        }).length;
        const stats = [
            ['activeJobCount', allJobs.length],
            ['academicProgramCount', categoriesCount],
            ['directUrlPercentage', allJobs.length ? Math.round(directLinks / allJobs.length * 100) + '%' : '0%'],
            ['savedJobCount', saved.length]
        ];
        stats.forEach(function(stat) {
            const element = document.getElementById(stat[0]);
            if (element) element.textContent = stat[1];
        });
    }

    function updateLocationFilter(allJobs) {
        const select = document.getElementById('jobLocation');
        if (!select) return;
        const selectedLocation = select.value;
        const locations = Array.from(new Set(allJobs.map(function(item) {
            return item.job.location || '';
        }).filter(Boolean))).sort();
        select.replaceChildren(new Option('All locations', 'all'));
        locations.forEach(function(location) {
            const label = location.replace(/^[^A-Za-z0-9]+/, '').trim();
            select.add(new Option(label || location, location));
        });
        if (locations.indexOf(selectedLocation) !== -1) select.value = selectedLocation;
    }

    const allJobs = [];
    categories.forEach(function(categoryGroup) {
        let block = document.createElement('div');
        block.className = 'category-block';
        block.dataset.categoryGroup = categoryGroup.category;

        categoryGroup.jobs.forEach(function(job) {
            allJobs.push({ job: job, category: categoryGroup.category });
            let card = document.createElement('div');
            card.className = 'job-card';
            card.dataset.category = categoryGroup.category;
            card.dataset.employmentType = job.employmentType || '';
            card.dataset.location = job.location || '';
            card.tabIndex = 0;
            if (job.url) card.dataset.url = job.url;

            let description = job.description || ('This ' + (job.tag || categoryGroup.label) + ' opportunity at ' + job.company + ' is a strong fit for students and alumni seeking practical experience, career growth, and role-based development in ' + (categoryGroup.label || 'this field') + '.');
            const savedJobs = getBookmarkedJobs();
            const isBookmarked = savedJobs.indexOf(bookmarkKey(job)) !== -1;
            const skillTags = Array.isArray(job.skills) ? job.skills.filter(Boolean).slice(0, 5) : [];
            card.innerHTML =
                '<div class="job-card-top">' +
                '<span class="job-tag">' + safeText(categoryGroup.label) + '</span>' +
                '<button class="job-bookmark-btn' + (isBookmarked ? ' is-bookmarked' : '') + '" type="button" aria-label="' + (isBookmarked ? 'Remove bookmark for ' : 'Bookmark ') + safeText(job.title) + '" aria-pressed="' + (isBookmarked ? 'true' : 'false') + '">&#9825;</button>' +
                '</div>' +
                '<h3>' + safeText(job.title) + '</h3>' +
                '<p class="company">' + safeText(job.company) + '</p>' +
                '<div class="job-meta">' +
                '<p class="job-info"><span aria-hidden="true">&#9679;</span> ' + safeText(job.location) + '</p>' +
                '<p class="job-info"><span aria-hidden="true">&#9711;</span> ' + safeText(job.employmentType) + '</p>' +
                '</div>' +
                '<div class="job-description"><p>' + safeText(description) + '</p>' +
                (skillTags.length ? '<div class="job-skills">' + skillTags.map(function(skill) { return '<span>' + safeText(skill) + '</span>'; }).join('') + '</div>' : '') +
                '</div>' +
                '<div class="job-card-actions">' +
                '<button class="job-details-btn" type="button" aria-expanded="false">Details</button>' +
                '<button class="application-track-btn" type="button">Mark as applied</button>' +
                '<button class="apply-btn" type="button">Apply Direct &#8599;</button>' +
                '</div>' +
                '<p class="application-track-status" role="status" aria-live="polite"></p>';

            card.querySelector('.job-bookmark-btn').addEventListener('click', function(event) {
                event.stopPropagation();
                const button = event.currentTarget;
                let bookmarks = getBookmarkedJobs();
                const key = bookmarkKey(job);
                const index = bookmarks.indexOf(key);
                if (index === -1) bookmarks.push(key);
                else bookmarks.splice(index, 1);
                try {
                    localStorage.setItem('imcc_bookmarked_jobs', JSON.stringify(bookmarks));
                    const bookmarked = index === -1;
                    button.classList.toggle('is-bookmarked', bookmarked);
                    button.setAttribute('aria-pressed', bookmarked ? 'true' : 'false');
                    button.setAttribute('aria-label', (bookmarked ? 'Remove bookmark for ' : 'Bookmark ') + job.title);
                    button.innerHTML = bookmarked ? '&#9829;' : '&#9825;';
                    updateDirectoryStats(allJobs);
                } catch (error) {
                    console.warn('Job bookmark could not be saved:', error.message);
                }
            });
            card.querySelector('.job-details-btn').addEventListener('click', function(event) {
                event.stopPropagation();
                const expanded = card.classList.toggle('is-open');
                event.currentTarget.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                event.currentTarget.textContent = expanded ? 'Hide details' : 'Details';
            });
            card.querySelector('.apply-btn').addEventListener('click', function(event) {
                event.stopPropagation();
                logJobEvent('apply_click', job, categoryGroup.category);
                applyJob(job.title, job.url);
            });
            card.querySelector('.application-track-btn').addEventListener('click', function(event) {
                event.stopPropagation();
                markJobAsApplied(job, card);
            });

            card.addEventListener('click', function(event) {
                if (event.target && event.target.closest('button')) {
                    return;
                }
                const expanded = card.classList.toggle('is-open');
                const detailsButton = card.querySelector('.job-details-btn');
                detailsButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                detailsButton.textContent = expanded ? 'Hide details' : 'Details';
            });

            card.addEventListener('keydown', function(event) {
                if (event.target !== card) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const expanded = card.classList.toggle('is-open');
                    const detailsButton = card.querySelector('.job-details-btn');
                    detailsButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                    detailsButton.textContent = expanded ? 'Hide details' : 'Details';
                }
            });

            block.appendChild(card);
        });

        if (categoryGroup.category === 'Education') {
            let linkPanel = document.createElement('div');
            linkPanel.className = 'course-link-panel';
            linkPanel.innerHTML =
                '<p>More Education job resources:</p>' +
                '<ul>' +
                '<li><a href="https://ph.jobstreet.com/teaching-jobs/in-Iligan-City-Lanao-del-Norte" target="_blank" rel="noopener noreferrer">JobStreet: Teaching Jobs in Iligan City</a></li>' +
                '<li><a href="https://ph.jobsora.com/jobs-teacher-iligan-city" target="_blank" rel="noopener noreferrer">Jobsora: Teacher Jobs in Iligan City</a></li>' +
                '<li><a href="https://ph.indeed.com/q-teacher-hiring,-iligan-city-l-iligan-jobs.html?vjk=2c527dc98bc55bdf" target="_blank" rel="noopener noreferrer">Indeed: Teacher Hiring in Iligan City</a></li>' +
                '<li><a href="https://www.indeed.com/q-school-teacher-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: School Teacher Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/education-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Education Jobs</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/teaching-jobs-SRCH_KO0,13.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Teaching & Education Jobs</a></li>' +
                '<li><a href="https://sites.google.com/deped.gov.ph/depedign-t1application/home?fbclid=IwY2xjawTeesdwZWVtAjEwAGJyaWQRMWgyRGVGQU83YUZkWVFsZG1zcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEebs609GU05MsPFVfxYekpyiEysWamRGy287LTgjM3uI8HKKZ4LqMSHEHpngU_aem_2OSJ-w4d6Vf5v5aBQ_O70Q" target="_blank" rel="noopener noreferrer">DepEd: Teacher Application Portal</a></li>' +
                '<li><a href="https://main.depedldn.com/vacant-positions/" target="_blank" rel="noopener noreferrer">DepEd LDN: Vacant Positions</a></li>' +
                '</ul>';
            block.appendChild(linkPanel);
        }

        if (categoryGroup.category === 'Business') {
            let businessLinkPanel = document.createElement('div');
            businessLinkPanel.className = 'course-link-panel';
            businessLinkPanel.innerHTML =
                '<p>More Business job resources:</p>' +
                '<ul>' +
                '<li><a href="https://ph.indeed.com/q-companies-in-iligan-hiring-l-iligan-jobs.html?vjk=72a9f1b9d79fe4c3" target="_blank" rel="noopener noreferrer">Indeed: Companies Hiring in Iligan</a></li>' +
                '<li><a href="https://ph.jobstreet.com/business+management-jobs/in-Iligan-City-Lanao-del-Norte" target="_blank" rel="noopener noreferrer">JobStreet: Business & Management Jobs in Iligan City</a></li>' +
                '<li><a href="http://glassdoor.com/Job/iligan-fresh-graduate-jobs-SRCH_IL.0,6_IC2297214_KO7,21.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Iligan Fresh Graduate Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/finance-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Finance Jobs</a></li>' +
                '<li><a href="https://www.indeed.com/q-business-administrator-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Business Administrator Jobs</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/business-jobs-SRCH_KO0,8.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Business & Office Jobs</a></li>' +
                '</ul>';
            block.appendChild(businessLinkPanel);
        }

        if (categoryGroup.category === 'Healthcare') {
            let healthcareLinkPanel = document.createElement('div');
            healthcareLinkPanel.className = 'course-link-panel';
            healthcareLinkPanel.innerHTML =
                '<p>More Healthcare job resources:</p>' +
                '<ul>' +
                '<li><a href="https://ph.jobstreet.com/healthcare-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Healthcare Jobs</a></li>' +
                '<li><a href="https://ph.jobsora.com/jobs-nursing-assistant-iligan-city" target="_blank" rel="noopener noreferrer">Jobsora: Nursing Assistant Jobs in Iligan City</a></li>' +
                '<li><a href="https://ph.indeed.com/q-department-of-health,-medical-technologist-l-iligan-jobs.html?vjk=19a6e9c341129f8f" target="_blank" rel="noopener noreferrer">Indeed: Department of Health Medical Technologist Jobs in Iligan</a></li>' +
                '<li><a href="https://www.indeed.com/q-nursing-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Nursing Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/medical-technologist-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Medical Technologist Jobs</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/healthcare-jobs-SRCH_KO0,11.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Healthcare Jobs</a></li>' +
                '</ul>';
            block.appendChild(healthcareLinkPanel);
        }

        if (categoryGroup.category === 'CCJE') {
            let ccjeLinkPanel = document.createElement('div');
            ccjeLinkPanel.className = 'course-link-panel';
            ccjeLinkPanel.innerHTML =
                '<p>More CCJE job resources:</p>' +
                '<ul>' +
                '<li><a href="https://www.pnp.gov.ph/" target="_blank" rel="noopener noreferrer">PNP: Philippine National Police</a></li>' +
                '<li><a href="https://sc.judiciary.gov.ph/" target="_blank" rel="noopener noreferrer">Supreme Court of the Philippines</a></li>' +
                '<li><a href="https://ph.jobstreet.com/criminology-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Criminology Jobs</a></li>' +
                '<li><a href="https://www.indeed.com/q-criminology-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Criminology Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/criminal-justice-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Criminal Justice Jobs</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/criminal-justice-jobs-SRCH_KO0,16.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Criminal Justice Jobs</a></li>' +
                '</ul>';
            block.appendChild(ccjeLinkPanel);
        }

        if (categoryGroup.category === 'Social Work') {
            let socialWorkLinkPanel = document.createElement('div');
            socialWorkLinkPanel.className = 'course-link-panel';
            socialWorkLinkPanel.innerHTML =
                '<p>More Social Work job resources:</p>' +
                '<ul>' +
                '<li><a href="https://ph.jobstreet.com/social-work-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Social Work Jobs</a></li>' +
                '<li><a href="https://www.indeed.com/q-social-worker-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Social Worker Openings</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/social-work-jobs-SRCH_KO0,11.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Social Work Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/community-development-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Community Development Jobs</a></li>' +
                '<li><a href="https://ph.indeed.com/q-social-work-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Social Work Jobs (Philippines)</a></li>' +
                '</ul>';
            block.appendChild(socialWorkLinkPanel);
        }

        if (categoryGroup.category === 'CHTM') {
            let chtmLinkPanel = document.createElement('div');
            chtmLinkPanel.className = 'course-link-panel';
            chtmLinkPanel.innerHTML =
                '<p>More CHTM job resources:</p>' +
                '<ul>' +
                '<li><a href="https://ph.jobstreet.com/hospitality-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Hospitality Jobs</a></li>' +
                '<li><a href="https://www.indeed.com/q-hospitality-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Hospitality & Tourism Jobs</a></li>' +
                '<li><a href="https://www.tourism.gov.ph/careers" target="_blank" rel="noopener noreferrer">DOT: Tourism Careers Philippines</a></li>' +
                '<li><a href="https://ph.jobstreet.com/hotel-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Hotel Jobs</a></li>' +
                '<li><a href="https://www.indeed.com/q-tourism-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Tourism Jobs</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/hospitality-jobs-SRCH_KO0,12.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Hospitality Jobs</a></li>' +
                '</ul>';
            block.appendChild(chtmLinkPanel);
        }

        if (categoryGroup.category === 'IT') {
            let itLinkPanel = document.createElement('div');
            itLinkPanel.className = 'course-link-panel';
            itLinkPanel.innerHTML =
                '<p>More IT job resources:</p>' +
                '<ul>' +
                '<li><a href="https://www.glassdoor.com/Job/iligan-city-it-jobs-SRCH_IL.0,11_IC4770610_KO12,14.htm" target="_blank" rel="noopener noreferrer">Glassdoor: Iligan City IT Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/it-related-jobs/in-Iligan-City-Lanao-del-Norte" target="_blank" rel="noopener noreferrer">JobStreet: IT-related Jobs in Iligan City</a></li>' +
                '<li><a href="https://ph.indeed.com/q-it-l-northern-mindanao-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: IT Jobs in Northern Mindanao</a></li>' +
                '<li><a href="https://www.indeed.com/q-software-developer-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: Software Developer Jobs</a></li>' +
                '<li><a href="https://ph.jobstreet.com/software-engineer-jobs" target="_blank" rel="noopener noreferrer">JobStreet: Software Engineer Jobs</a></li>' +
                '<li><a href="https://www.glassdoor.com/Job/it-jobs-SRCH_KO0,2.htm" target="_blank" rel="noopener noreferrer">Glassdoor: IT & Software Jobs</a></li>' +
                '</ul>';
            block.appendChild(itLinkPanel);
        }

        container.appendChild(block);
        container.appendChild(block);
    });
}

window.addEventListener('DOMContentLoaded', function() {
    renderJobs();
});
