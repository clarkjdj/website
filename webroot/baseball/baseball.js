// Baseball Database Application
(function() {
    'use strict';

    // Global state
    let baseballData = null;
    let filteredPlayers = [];
    let currentSort = 'name';

    // Filter state
    const filters = {
        yearMin: 1900,
        yearMax: 2024,
        minAvg: 0.250,
        minHR: 0,
        minWAR: 0,
        era: 'all'
    };

    // Initialize application
    $(document).ready(function() {
        loadData();
        initializeControls();
        initializeDial();
    });

    // Load baseball data
    function loadData() {
        $.getJSON('data.json', function(data) {
            baseballData = data;
            filteredPlayers = data.players;
            displayPlayers();
            updateStats();
        }).fail(function() {
            console.error('Failed to load baseball data');
            $('#playersGrid').html('<div class="no-results">Error loading data. Please refresh the page.</div>');
        });
    }

    // Initialize all controls
    function initializeControls() {
        // Year range sliders
        $('#yearMin').on('input', function() {
            const min = parseInt($(this).val());
            const max = parseInt($('#yearMax').val());
            if (min > max) {
                $(this).val(max);
                filters.yearMin = max;
            } else {
                filters.yearMin = min;
            }
            updateYearDisplay();
            filterPlayers();
        });

        $('#yearMax').on('input', function() {
            const max = parseInt($(this).val());
            const min = parseInt($('#yearMin').val());
            if (max < min) {
                $(this).val(min);
                filters.yearMax = min;
            } else {
                filters.yearMax = max;
            }
            updateYearDisplay();
            filterPlayers();
        });

        // Batting average slider
        $('#avgSlider').on('input', function() {
            const value = parseInt($(this).val());
            filters.minAvg = value / 1000;
            $('#avgDisplay').text('.' + value);
            filterPlayers();
        });

        // Home runs slider
        $('#hrSlider').on('input', function() {
            const value = parseInt($(this).val());
            filters.minHR = value;
            $('#hrDisplay').text(value.toLocaleString());
            filterPlayers();
        });

        // Era filter
        $('#eraFilter').on('change', function() {
            filters.era = $(this).val();
            filterPlayers();
        });

        // Sort buttons
        $('.sort-btn').on('click', function() {
            $('.sort-btn').removeClass('active');
            $(this).addClass('active');
            currentSort = $(this).data('sort');
            displayPlayers();
        });

        // Reset button
        $('#resetBtn').on('click', function() {
            resetFilters();
        });
    }

    // Initialize WAR dial
    function initializeDial() {
        const svg = document.getElementById('warDial');
        const handle = document.getElementById('warHandle');
        const progress = document.getElementById('warProgress');
        const valueText = document.getElementById('warValue');

        // Add gradient definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'dialGradient');
        gradient.innerHTML = '<stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />';
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);

        const radius = 80;
        const circumference = 2 * Math.PI * radius;
        progress.style.strokeDasharray = circumference;
        progress.style.strokeDashoffset = circumference;

        let isDragging = false;

        function updateDial(angle) {
            // Constrain angle to 0-360
            angle = ((angle % 360) + 360) % 360;

            // Map angle to WAR value (0-200)
            const warValue = Math.round((angle / 360) * 200);
            filters.minWAR = warValue;

            // Update handle position
            const radians = (angle - 90) * (Math.PI / 180);
            const x = 100 + radius * Math.cos(radians);
            const y = 100 + radius * Math.sin(radians);
            handle.setAttribute('cx', x);
            handle.setAttribute('cy', y);

            // Update progress circle
            const offset = circumference - (angle / 360) * circumference;
            progress.style.strokeDashoffset = offset;

            // Update value text
            valueText.textContent = warValue;
            $('#warDisplay').text(warValue.toFixed(1));

            // Filter players
            if (!isDragging || warValue % 5 === 0) {
                filterPlayers();
            }
        }

        function getAngleFromEvent(event) {
            const rect = svg.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const clientX = event.clientX || (event.touches && event.touches[0].clientX);
            const clientY = event.clientY || (event.touches && event.touches[0].clientY);

            const dx = clientX - centerX;
            const dy = clientY - centerY;

            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            return angle;
        }

        function startDrag(event) {
            isDragging = true;
            handle.style.cursor = 'grabbing';
            event.preventDefault();
        }

        function drag(event) {
            if (!isDragging) return;
            const angle = getAngleFromEvent(event);
            updateDial(angle);
            event.preventDefault();
        }

        function stopDrag() {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'grab';
                filterPlayers();
            }
        }

        // Mouse events
        handle.addEventListener('mousedown', startDrag);
        svg.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Touch events
        handle.addEventListener('touchstart', startDrag);
        svg.addEventListener('touchmove', drag);
        document.addEventListener('touchend', stopDrag);

        // Click anywhere on dial
        svg.addEventListener('click', function(event) {
            if (event.target === handle) return;
            const angle = getAngleFromEvent(event);
            updateDial(angle);
        });

        // Initialize at 0
        updateDial(0);
    }

    // Update year display
    function updateYearDisplay() {
        $('#yearDisplay').text(filters.yearMin + ' - ' + filters.yearMax);
    }

    // Filter players based on current filters
    function filterPlayers() {
        if (!baseballData) return;

        filteredPlayers = baseballData.players.filter(player => {
            // Year range filter
            const startYear = player.yearsActive[0];
            const endYear = player.yearsActive[1];
            if (endYear < filters.yearMin || startYear > filters.yearMax) {
                return false;
            }

            // Batting average filter
            if (player.batting.avg < filters.minAvg) {
                return false;
            }

            // Home runs filter
            if (player.batting.hr < filters.minHR) {
                return false;
            }

            // WAR filter
            if (player.warp < filters.minWAR) {
                return false;
            }

            // Era filter
            if (filters.era !== 'all' && player.era !== filters.era) {
                return false;
            }

            return true;
        });

        displayPlayers();
        updateStats();
    }

    // Sort players
    function sortPlayers(players) {
        const sorted = [...players];

        sorted.sort((a, b) => {
            switch(currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'avg':
                    return b.batting.avg - a.batting.avg;
                case 'hr':
                    return b.batting.hr - a.batting.hr;
                case 'hits':
                    return b.batting.hits - a.batting.hits;
                case 'war':
                    return b.warp - a.warp;
                default:
                    return 0;
            }
        });

        return sorted;
    }

    // Display players in grid
    function displayPlayers() {
        const grid = $('#playersGrid');

        if (filteredPlayers.length === 0) {
            grid.html('<div class="no-results">No players match your filters. Try adjusting your criteria.</div>');
            return;
        }

        const sorted = sortPlayers(filteredPlayers);
        let html = '';

        sorted.forEach(player => {
            html += `
                <div class="player-card">
                    <h3 class="player-name">${player.name}</h3>
                    <div class="player-team">${player.team}</div>
                    <span class="player-position">${player.position}</span>
                    <div class="player-era">${player.era} Era (${player.yearsActive[0]}-${player.yearsActive[1]})</div>

                    <div class="player-stats">
                        <div class="stat-item">
                            <span class="stat-value">${player.batting.avg.toFixed(3)}</span>
                            <span class="stat-name">AVG</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${player.batting.hr.toLocaleString()}</span>
                            <span class="stat-name">HR</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${player.batting.rbi.toLocaleString()}</span>
                            <span class="stat-name">RBI</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${player.batting.hits.toLocaleString()}</span>
                            <span class="stat-name">Hits</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${player.batting.runs.toLocaleString()}</span>
                            <span class="stat-name">Runs</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${player.batting.sb.toLocaleString()}</span>
                            <span class="stat-name">SB</span>
                        </div>
                    </div>

                    <div class="player-war">WAR: ${player.warp.toFixed(1)}</div>

                    <div class="player-achievements">
                        <div class="achievements-title">Achievements</div>
                        ${player.achievements.slice(0, 3).map(ach =>
                            `<div class="achievement-item">${ach}</div>`
                        ).join('')}
                    </div>
                </div>
            `;
        });

        grid.html(html);
    }

    // Update statistics overview
    function updateStats() {
        const count = filteredPlayers.length;
        $('#totalPlayers').text(count);

        if (count === 0) {
            $('#avgBA').text('-');
            $('#totalHR').text('-');
            $('#avgWAR').text('-');
            return;
        }

        // Calculate average batting average
        const avgBA = filteredPlayers.reduce((sum, p) => sum + p.batting.avg, 0) / count;
        $('#avgBA').text(avgBA.toFixed(3));

        // Calculate total home runs
        const totalHR = filteredPlayers.reduce((sum, p) => sum + p.batting.hr, 0);
        $('#totalHR').text(totalHR.toLocaleString());

        // Calculate average WAR
        const avgWAR = filteredPlayers.reduce((sum, p) => sum + p.warp, 0) / count;
        $('#avgWAR').text(avgWAR.toFixed(1));
    }

    // Reset all filters
    function resetFilters() {
        filters.yearMin = 1900;
        filters.yearMax = 2024;
        filters.minAvg = 0.250;
        filters.minHR = 0;
        filters.minWAR = 0;
        filters.era = 'all';

        $('#yearMin').val(1900);
        $('#yearMax').val(2024);
        $('#avgSlider').val(250);
        $('#hrSlider').val(0);
        $('#eraFilter').val('all');

        updateYearDisplay();
        $('#avgDisplay').text('.250');
        $('#hrDisplay').text('0');

        // Reset dial
        const handle = document.getElementById('warHandle');
        const progress = document.getElementById('warProgress');
        const valueText = document.getElementById('warValue');
        const radius = 80;
        const circumference = 2 * Math.PI * radius;

        handle.setAttribute('cx', 100);
        handle.setAttribute('cy', 20);
        progress.style.strokeDashoffset = circumference;
        valueText.textContent = '0';
        $('#warDisplay').text('0.0');

        // Reset sort
        currentSort = 'name';
        $('.sort-btn').removeClass('active');
        $('.sort-btn[data-sort="name"]').addClass('active');

        filterPlayers();
    }

})();
