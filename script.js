// Global variables
let offset = 0;
const limit = 20;
let totalPokemon = 0;
let allPokemon = [];
let filteredPokemon = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let favoritesVisible = false;
let caughtVisible = false; // New flag for caught Pokémon visibility
let currentPokemonData = null;
let statsChart = null;
let viewedPokemon = new Set(JSON.parse(localStorage.getItem('viewedPokemon')) || []);
let caughtPokemon = new Set(JSON.parse(localStorage.getItem('caughtPokemon')) || []);
const TOTAL_POKEMON = 151;
let encounterTimer = null;
let isMusicPlaying = localStorage.getItem('musicPlaying') === 'true'; // New: track music state


// const volumeSlider = document.getElementById('musicVolume');
// if (volumeSlider) {
//     music.volume = volumeSlider.value;
//     volumeSlider.addEventListener('input', () => music.volume = volumeSlider.value);
// }

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Show/hide loading spinner with Anime.js
function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.style.display = 'block';
        anime({
            targets: loading,
            opacity: [0, 1],
            scale: [0.8, 1],
            duration: 500,
            easing: 'easeOutQuad'
        });
    } else {
        anime({
            targets: loading,
            opacity: 0,
            scale: 0.8,
            duration: 300,
            easing: 'easeInQuad',
            complete: () => loading.style.display = 'none'
        });
    }
}

// Update completion tracker to include caught status
function updateCompletionTracker() {
    const completion = Math.round((caughtPokemon.size / TOTAL_POKEMON) * 100);
    document.getElementById('completionTracker').textContent = `Pokédex: ${completion}% (${caughtPokemon.size}/${TOTAL_POKEMON})`;
    localStorage.setItem('viewedPokemon', JSON.stringify([...viewedPokemon]));
}

// Populate type filter dropdown
async function populateTypeFilter() {
    const response = await fetch('https://pokeapi.co/api/v2/type');
    const data = await response.json();
    const typeSelect = document.getElementById('typeFilter');
    
    data.results.forEach(type => {
        const option = document.createElement('option');
        option.value = type.name;
        option.textContent = type.name.charAt(0).toUpperCase() + type.name.slice(1);
        typeSelect.appendChild(option);
    });
}

// Fetch all Pokémon for sorting and suggestions
async function fetchAllPokemon() {
    toggleLoading(true);
    try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10000');
        const data = await response.json();
        allPokemon = data.results.map((poke, index) => ({
            name: poke.name,
            url: poke.url,
            id: index + 1
        }));
        totalPokemon = allPokemon.length;
        filteredPokemon = [...allPokemon];
        console.log('Fetched all Pokémon:', allPokemon.slice(0, 5));
        fetchPokemonList();
    } catch (error) {
        document.getElementById('pokemonContainer').innerHTML = `<p>Error: ${error.message}</p>`;
    } finally {
        toggleLoading(false);
    }
}

// Fetch a single Pokémon by name or ID
async function fetchPokemon() {
    const input = document.getElementById('pokemonInput').value.toLowerCase().trim();
    const container = document.getElementById('pokemonContainer');
    container.innerHTML = '';
    toggleLoading(true);

    if (!input) {
        fetchPokemonList();
        return;
    }

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${input}`);
        if (!response.ok) throw new Error('Pokémon not found');
        const data = await response.json();
        console.log('Fetched single Pokémon:', data);
        displayPokemon(data, container);
        const card = container.querySelector('.pokemon-card');
        if (card) {
            anime({
                targets: card,
                opacity: [0, 1],
                translateY: [50, 0],
                duration: 800,
                easing: 'easeOutElastic(1, .8)'
            });
        }
    } catch (error) {
        container.innerHTML = `<p>Error: ${error.message}</p>`;
    } finally {
        toggleLoading(false);
    }
}

// Fetch and display the paginated, sorted Pokémon list
async function fetchPokemonList() {
    const container = document.getElementById('pokemonContainer');
    const typeFilter = document.getElementById('typeFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    container.innerHTML = '';
    toggleLoading(true);

    if (typeFilter) {
        const response = await fetch(`https://pokeapi.co/api/v2/type/${typeFilter}`);
        const data = await response.json();
        filteredPokemon = data.pokemon.map(p => ({
            name: p.pokemon.name,
            url: p.pokemon.url,
            id: parseInt(p.pokemon.url.split('/').slice(-2, -1)[0])
        }));
    } else {
        filteredPokemon = [...allPokemon];
    }

    filteredPokemon.sort((a, b) => {
        if (sortFilter === 'name-asc') return a.name.localeCompare(b.name);
        if (sortFilter === 'name-desc') return b.name.localeCompare(a.name);
        if (sortFilter === 'id-desc') return b.id - a.id;
        return a.id - b.id;
    });

    const paginatedList = filteredPokemon.slice(offset, offset + limit);
    totalPokemon = filteredPokemon.length;

    try {
        const pokePromises = paginatedList.map(poke => fetch(poke.url).then(res => res.json()));
        const pokeDataArray = await Promise.all(pokePromises);

        pokeDataArray.forEach(data => {
            console.log('Fetched Pokémon for list:', data);
            displayPokemon(data, container);
        });

        updatePaginationButtons();
        animateCards(container);
    } catch (error) {
        container.innerHTML = `<p>Error: ${error.message}</p>`;
    } finally {
        toggleLoading(false);
    }
}

// Animate cards with Anime.js
function animateCards(container) {
    const cards = container.querySelectorAll('.pokemon-card');
    anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [50, 0],
        duration: 800,
        delay: anime.stagger(100),
        easing: 'easeOutElastic(1, .8)'
    });
}

// Display a single Pokémon card with flip effect
function displayPokemon(data, container) {
    console.log('Rendering Pokémon:', data);

    const pokemonCard = document.createElement('div');
    pokemonCard.classList.add('pokemon-card');
    if (data.types && data.types.length > 0) {
        const primaryType = data.types[0].type.name;
        pokemonCard.classList.add(primaryType);
    } else {
        console.warn('No types found for:', data);
    }

    const baseStatTotal = data.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
    if (baseStatTotal > 600) {
        pokemonCard.classList.add('legendary');
    } else if (baseStatTotal >= 400) {
        pokemonCard.classList.add('rare');
    } else {
        pokemonCard.classList.add('common');
    }

    const cardInner = document.createElement('div');
    cardInner.classList.add('card-inner');

    const cardFront = document.createElement('div');
    cardFront.classList.add('card-front');

    const img = document.createElement('img');
    img.src = data.sprites?.front_default || 'https://via.placeholder.com/130';
    img.alt = `${data.name || 'Unknown'} sprite`;
    cardFront.appendChild(img);

    const shinyToggle = document.createElement('div');
    shinyToggle.classList.add('shiny-toggle');
    shinyToggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.167 1.19-5.916 5.769 1.396 8.136L12 19.897l-7.315 3.846 1.396-8.136L.165 9.208l8.167-1.19L12 .587z"/></svg>';
    let isShiny = false;
    shinyToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        isShiny = !isShiny;
        shinyToggle.classList.toggle('active', isShiny);
        img.src = isShiny ? (data.sprites?.front_shiny || img.src) : (data.sprites?.front_default || img.src);
        anime({
            targets: img,
            opacity: [0, 1],
            duration: 300,
            easing: 'easeInOutQuad'
        });
    });
    cardFront.appendChild(shinyToggle);

    const cryButton = document.createElement('div');
    cryButton.classList.add('cry-button');
    cryButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.73 2.5-2.25 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-/<path>-7.86-7-8.77z"/></svg>';
    cryButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`Attempting to play cry for ${data.name}`);
        const audio = document.getElementById('pokemonCry');
        if (!audio) {
            console.error('Audio element #pokemonCry not found in DOM');
            return;
        }
        const cryUrl = data.cries?.latest || '';
        if (cryUrl) {
            audio.pause(); // Reset audio state
            audio.currentTime = 0; // Rewind to start
            audio.src = cryUrl;
            audio.play().catch(error => {
                console.error('Cry playback failed:', error);
                alert('Could not play the cry for this Pokémon.');
            });
        } else {
            console.warn(`No cry URL for ${data.name}`);
            alert('No cry available for this Pokémon.');
        }
    });
    cardFront.appendChild(cryButton);

    const caughtToggle = document.createElement('div');
    caughtToggle.classList.add('caught-toggle');
    caughtToggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>';
    caughtToggle.classList.toggle('caught', caughtPokemon.has(data.id));
    caughtToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (caughtPokemon.has(data.id)) {
            caughtPokemon.delete(data.id);
        } else {
            caughtPokemon.add(data.id);
        }
        caughtToggle.classList.toggle('caught');
        localStorage.setItem('caughtPokemon', JSON.stringify([...caughtPokemon]));
        updateCompletionTracker();
        if (caughtVisible) displayCaughtPokemon();
    });
    cardFront.appendChild(caughtToggle);

    const name = document.createElement('h2');
    name.textContent = data.name || 'Unknown';
    if (data.types) {
        data.types.forEach(type => {
            const icon = document.createElement('span');
            icon.classList.add('type-icon', type.type.name);
            name.appendChild(icon);
        });
    }
    cardFront.appendChild(name);

    const types = document.createElement('p');
    types.textContent = data.types ? data.types.map(type => type.type.name).join(', ') : 'No types';
    cardFront.appendChild(types);

    const stats = document.createElement('p');
    stats.textContent = data.stats ? `HP: ${data.stats[0].base_stat} | Atk: ${data.stats[1].base_stat}` : 'No stats';
    cardFront.appendChild(stats);

    const cardBack = document.createElement('div');
    cardBack.classList.add('card-back');

    const backTitle = document.createElement('h3');
    backTitle.textContent = `${data.name || 'Unknown'} Stats`;
    cardBack.appendChild(backTitle);

    const backStats = document.createElement('p');
    backStats.innerHTML = data.stats ? `
        HP: ${data.stats[0].base_stat}<br>
        Attack: ${data.stats[1].base_stat}<br>
        Defense: ${data.stats[2].base_stat}<br>
        Sp. Atk: ${data.stats[3].base_stat}<br>
        Sp. Def: ${data.stats[4].base_stat}<br>
        Speed: ${data.stats[5].base_stat}
    ` : 'No stats available';
    cardBack.appendChild(backStats);

    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    pokemonCard.appendChild(cardInner);

    let isFlipped = false;
    pokemonCard.addEventListener('mouseenter', () => {
        if (!isFlipped) {
            anime({
                targets: cardInner,
                rotateY: 180,
                duration: 600,
                easing: 'easeInOutQuad'
            });
            isFlipped = true;
        }
    });
    pokemonCard.addEventListener('mouseleave', () => {
        if (isFlipped) {
            anime({
                targets: cardInner,
                rotateY: 0,
                duration: 600,
                easing: 'easeInOutQuad'
            });
            isFlipped = false;
        }
    });

    pokemonCard.addEventListener('click', (e) => {
        e.preventDefault();
        showPokemonDetails(data);
    });

    container.appendChild(pokemonCard);
}


// Start wild Pokémon encounter
function startWildEncounter() {
    if (encounterTimer) clearInterval(encounterTimer);

    const encounterPopup = document.createElement('div');
    encounterPopup.id = 'encounterPopup';
    document.body.appendChild(encounterPopup);

    const randomPokemon = allPokemon[Math.floor(Math.random() * allPokemon.length)];
    fetch(randomPokemon.url)
        .then(res => res.json())
        .then(data => {
            encounterPopup.innerHTML = `
                <div class="encounter-content">
                    <h3>A wild ${data.name} appeared!</h3>
                    <img src="${data.sprites.front_default}" alt="${data.name}">
                    <p id="encounterTimer">Time left: 10s</p>
                    <button id="catchBtn">Catch</button>
                </div>
            `;

            let timeLeft = 10;
            const timerDisplay = document.getElementById('encounterTimer');
            encounterTimer = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = `Time left: ${timeLeft}s`;
                if (timeLeft <= 0) {
                    clearInterval(encounterTimer);
                    encounterPopup.innerHTML = `<p>The wild ${data.name} fled!</p>`;
                    setTimeout(() => encounterPopup.remove(), 2000);
                }
            }, 1000);

            document.getElementById('catchBtn').addEventListener('click', () => {
                clearInterval(encounterTimer);
                caughtPokemon.add(data.id);
                localStorage.setItem('caughtPokemon', JSON.stringify([...caughtPokemon]));
                updateCompletionTracker();
                encounterPopup.innerHTML = `<p>You caught ${data.name}!</p>`;
                setTimeout(() => encounterPopup.remove(), 2000);
                if (caughtVisible) displayCaughtPokemon(); // Refresh caught list if visible
            });

            anime({
                targets: '#encounterPopup',
                opacity: [0, 1],
                translateY: [-50, 0],
                duration: 500,
                easing: 'easeOutQuad'
            });
        });
}

// Display caught Pokémon
async function displayCaughtPokemon() {
    const container = document.getElementById('caughtContainer');
    container.innerHTML = '';
    toggleLoading(true);

    try {
        if (caughtPokemon.size === 0) {
            container.innerHTML = '<p>No Pokémon caught yet!</p>';
        } else {
            const caughtArray = Array.from(caughtPokemon);
            for (const id of caughtArray) {
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                const data = await response.json();
                displayPokemon(data, container);
            }
            animateCards(container);
        }
    } catch (error) {
        container.innerHTML = `<p>Error loading caught Pokémon: ${error.message}</p>`;
    } finally {
        toggleLoading(false);
    }
}

// Toggle caught Pokémon visibility (updated)
function toggleCaughtPokemon() {
    const container = document.getElementById('caughtContainer');
    const btn = document.getElementById('viewCaughtBtn');
    caughtVisible = !caughtVisible;
    container.style.display = caughtVisible ? 'grid' : 'none';
    btn.textContent = caughtVisible ? 'Hide Caught Pokémon' : 'View Caught Pokémon';
    if (caughtVisible) displayCaughtPokemon();
    updateCaughtControls(); // Ensure controls update after toggle
}

// Update caught controls visibility (modified)
function updateCaughtControls() {
    const viewBtn = document.getElementById('viewCaughtBtn');
    const releaseBtn = document.getElementById('releaseAllCaughtBtn');
    viewBtn.style.display = 'inline-block'; // Always visible
    releaseBtn.style.display = caughtPokemon.size > 0 && caughtVisible ? 'inline-block' : 'none'; // Show only if caught Pokémon exist and list is visible
}

// Clear all caught Pokémon
function releaseAllCaught() {
    if (confirm('Are you sure you want to release all caught Pokémon?')) {
        caughtPokemon.clear();
        localStorage.setItem('caughtPokemon', JSON.stringify([...caughtPokemon]));
        updateCompletionTracker();
        if (caughtVisible) displayCaughtPokemon(); // Refresh the list if visible
        updateCaughtControls();
    }
}

// Fetch evolution chain data
async function fetchEvolutionChain(speciesUrl) {
    try {
        const speciesResponse = await fetch(speciesUrl);
        const speciesData = await speciesResponse.json();
        const chainResponse = await fetch(speciesData.evolution_chain.url);
        const chainData = await chainResponse.json();
        return parseEvolutionChain(chainData.chain);
    } catch (error) {
        console.error('Error fetching evolution chain:', error);
        return [];
    }
}

// Parse evolution chain recursively
function parseEvolutionChain(chain) {
    const evolutions = [];
    let current = chain;

    while (current) {
        const name = current.species.name;
        const id = current.species.url.split('/').slice(-2, -1)[0];
        evolutions.push({ name, id });
        current = current.evolves_to.length > 0 ? current.evolves_to[0] : null;
    }

    return evolutions;
}

// Update modal content smoothly
async function updateModalContent(data) {
    const modalContent = document.getElementById('modalContent');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const playCryBtn = document.getElementById('playCryBtn');

    viewedPokemon.add(data.id);
    updateCompletionTracker();

    currentPokemonData = data;

    await anime({
        targets: modalContent.children,
        opacity: 0,
        duration: 300,
        easing: 'easeOutQuad'
    }).finished;

    modalContent.innerHTML = '';

    const img = document.createElement('img');
    img.src = data.sprites.front_default || 'https://via.placeholder.com/150';
    modalContent.appendChild(img);

    const name = document.createElement('h2');
    name.textContent = data.name;
    modalContent.appendChild(name);

    const types = document.createElement('p');
    types.textContent = 'Types: ' + data.types.map(type => type.type.name).join(', ');
    modalContent.appendChild(types);

    const height = document.createElement('p');
    height.textContent = `Height: ${data.height / 10} m`;
    modalContent.appendChild(height);

    const weight = document.createElement('p');
    weight.textContent = `Weight: ${data.weight / 10} kg`;
    modalContent.appendChild(weight);

    const abilities = document.createElement('p');
    abilities.textContent = 'Abilities: ' + data.abilities.map(ability => ability.ability.name).join(', ');
    modalContent.appendChild(abilities);

    const canvas = document.createElement('canvas');
    canvas.classList.add('stats-chart');
    modalContent.appendChild(canvas);

    if (statsChart) statsChart.destroy();
    statsChart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'],
            datasets: [{
                label: `${data.name}'s Stats`,
                data: data.stats.map(stat => stat.base_stat),
                backgroundColor: 'rgba(255, 203, 5, 0.2)',
                borderColor: '#ffcb05',
                borderWidth: 2,
                pointBackgroundColor: '#ffcb05'
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 255,
                    ticks: { stepSize: 50, color: '#333' },
                    grid: { color: '#ccc' },
                    pointLabels: { color: '#333' }
                }
            },
            plugins: {
                legend: { labels: { color: '#333' } }
            }
        }
    });

    const evolutionDiv = document.createElement('div');
    evolutionDiv.classList.add('evolution-chain');
    const evolutions = await fetchEvolutionChain(`https://pokeapi.co/api/v2/pokemon-species/${data.id}/`);
    for (const evo of evolutions) {
        const stageDiv = document.createElement('div');
        stageDiv.classList.add('evolution-stage');

        const evoImg = document.createElement('img');
        const evoData = await fetch(`https://pokeapi.co/api/v2/pokemon/${evo.id}`).then(res => res.json());
        evoImg.src = evoData.sprites.front_default || 'https://via.placeholder.com/80';
        evoImg.alt = evo.name;

        const evoName = document.createElement('p');
        evoName.textContent = evo.name;

        stageDiv.appendChild(evoImg);
        stageDiv.appendChild(evoName);
        stageDiv.onclick = () => {
            fetch(`https://pokeapi.co/api/v2/pokemon/${evo.id}`)
                .then(res => res.json())
                .then(newData => updateModalContent(newData));
        };

        evolutionDiv.appendChild(stageDiv);
    }
    modalContent.appendChild(evolutionDiv);

    const isFavorite = favorites.some(fav => fav.id === data.id);
    favoriteBtn.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteBtn.onclick = () => toggleFavorite(data);
    playCryBtn.onclick = () => playPokemonCry(data);

    anime({
        targets: modalContent.children,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutQuad',
        delay: anime.stagger(100)
    });
}

// Show detailed view in modal
function showPokemonDetails(data) {
    const modal = document.getElementById('pokemonModal');
    modal.style.display = 'block';
    updateModalContent(data);
    anime({
        targets: '.modal-content',
        opacity: [0, 1],
        translateY: [-100, 0],
        scale: [0.9, 1],
        duration: 600,
        easing: 'easeOutBounce'
    });
}

// Play Pokémon cry
function playPokemonCry(data) {
    const audio = document.getElementById('pokemonCry');
    const cryUrl = data.cries && data.cries.latest ? data.cries.latest : null;
    
    if (cryUrl) {
        audio.src = cryUrl;
        audio.play().catch(error => {
            console.error('Error playing cry:', error);
            alert('Could not play the cry for this Pokémon.');
        });
    } else {
        alert('No latest cry available for this Pokémon.');
    }
}

// Toggle favorite status
function toggleFavorite(data) {
    const index = favorites.findIndex(fav => fav.id === data.id);
    if (index === -1) {
        favorites.push({ id: data.id, name: data.name });
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateModalContent(data);
    if (favoritesVisible) displayFavorites();
    updateFavoritesControls();
}

// Display favorites
async function displayFavorites() {
    const container = document.getElementById('favoritesContainer');
    container.innerHTML = '';
    toggleLoading(true);

    try {
        if (favorites.length === 0) {
            container.innerHTML = '<p>No favorite Pokémon yet!</p>';
        } else {
            for (const fav of favorites) {
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${fav.id}`);
                const data = await response.json();
                displayPokemon(data, container);
            }
            animateCards(container);
        }
    } catch (error) {
        container.innerHTML = `<p>Error loading favorites: ${error.message}</p>`;
    } finally {
        toggleLoading(false);
    }
}

// Toggle favorites visibility
function toggleFavorites() {
    const container = document.getElementById('favoritesContainer');
    const btn = document.getElementById('viewFavoritesBtn');
    favoritesVisible = !favoritesVisible;
    container.style.display = favoritesVisible ? 'grid' : 'none';
    btn.textContent = favoritesVisible ? 'Hide Favorites' : 'View Favorites';
    if (favoritesVisible) displayFavorites();
    updateFavoritesControls();
}

// Clear all favorites
function clearFavorites() {
    if (confirm('Are you sure you want to clear all favorites?')) {
        favorites = [];
        localStorage.setItem('favorites', JSON.stringify(favorites));
        displayFavorites();
        updateFavoritesControls();
    }
}

// Update favorites controls visibility
function updateFavoritesControls() {
    const clearBtn = document.getElementById('clearFavoritesBtn');
    const viewBtn = document.getElementById('viewFavoritesBtn');
    clearBtn.style.display = favoritesVisible && favorites.length > 0 ? 'inline-block' : 'none';
    viewBtn.style.display = 'inline-block';
    viewBtn.textContent = favoritesVisible ? 'Hide Favorites' : (favorites.length > 0 ? 'View Favorites' : 'View Favorites (Empty)');
}

// Update pagination buttons
function updatePaginationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = offset === 0;
    nextBtn.disabled = offset + limit >= totalPokemon;
}

// Change page for pagination
function changePage(direction) {
    offset += direction * limit;
    if (offset < 0) offset = 0;
    fetchPokemonList();
}

// Search suggestions
function showSuggestions(input) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    if (!input) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    const matches = allPokemon
        .filter(poke => poke.name.toLowerCase().startsWith(input.toLowerCase()))
        .slice(0, 5);

    if (matches.length > 0) {
        matches.forEach(poke => {
            const item = document.createElement('div');
            item.classList.add('suggestion-item');
            item.textContent = poke.name;
            item.onclick = () => {
                document.getElementById('pokemonInput').value = poke.name;
                fetchPokemon();
                suggestionsDiv.style.display = 'none';
            };
            suggestionsDiv.appendChild(item);
        });
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.style.display = 'none';
    }
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Modal close functionality
document.querySelector('.close').onclick = function() {
    if (statsChart) statsChart.destroy();
    anime({
        targets: '.modal-content',
        opacity: 0,
        translateY: -100,
        scale: 0.9,
        duration: 400,
        easing: 'easeInQuad',
        complete: () => document.getElementById('pokemonModal').style.display = 'none'
    });
};

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('pokemonModal');
    if (event.target === modal) {
        if (statsChart) statsChart.destroy();
        anime({
            targets: '.modal-content',
            opacity: 0,
            translateY: -100,
            scale: 0.9,
            duration: 400,
            easing: 'easeInQuad',
            complete: () => modal.style.display = 'none'
        });
    }
};

// Event listeners (updated)
window.onload = function() {
    populateTypeFilter();
    fetchAllPokemon();
    updateFavoritesControls();
    updateCaughtControls();

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    document.getElementById('sortFilter').addEventListener('change', () => {
        offset = 0;
        fetchPokemonList();
    });
    document.getElementById('typeFilter').addEventListener('change', () => {
        offset = 0;
        fetchPokemonList();
    });

    const encounterBtn = document.getElementById('encounterBtn');
    if (encounterBtn) {
        encounterBtn.addEventListener('click', startWildEncounter);
    } else {
        console.warn('Encounter button not found in HTML');
    }

    const viewCaughtBtn = document.getElementById('viewCaughtBtn');
    if (viewCaughtBtn) {
        viewCaughtBtn.addEventListener('click', toggleCaughtPokemon);
    } else {
        console.warn('View Caught button not found in HTML');
    }

    const releaseAllCaughtBtn = document.getElementById('releaseAllCaughtBtn');
    if (releaseAllCaughtBtn) {
        releaseAllCaughtBtn.addEventListener('click', releaseAllCaught);
    } else {
        console.warn('Release All Caught button not found in HTML');
    }

    // New: Music toggle logic
    const music = document.getElementById('backgroundMusic');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    if (music && toggleMusicBtn) {
        // Set initial state
        toggleMusicBtn.textContent = isMusicPlaying ? 'Mute Music' : 'Play Music';
        if (isMusicPlaying) {
            music.play().catch(error => console.error('Music playback failed:', error));
        }

        toggleMusicBtn.addEventListener('click', () => {
            if (isMusicPlaying) {
                music.pause();
                toggleMusicBtn.textContent = 'Play Music';
            } else {
                music.play().catch(error => console.error('Music playback failed:', error));
                toggleMusicBtn.textContent = 'Mute Music';
            }
            isMusicPlaying = !isMusicPlaying;
            localStorage.setItem('musicPlaying', isMusicPlaying);
        });
    } else {
        console.warn('Music or toggle button not found in HTML');
    }

    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            anime({
                targets: btn,
                scale: 1.05,
                duration: 300,
                easing: 'easeOutQuad'
            });
        });
        btn.addEventListener('mouseleave', () => {
            anime({
                targets: btn,
                scale: 1,
                duration: 300,
                easing: 'easeInQuad'
            });
        });
    });
};

document.getElementById('pokemonInput').addEventListener('input', debounce((e) => {
    offset = 0;
    showSuggestions(e.target.value);
    fetchPokemon();
}, 300));