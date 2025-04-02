// Global variables
let offset = 0;
const limit = 20;
let totalPokemon = 0;
let allPokemon = [];
let filteredPokemon = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let favoritesVisible = false;
let currentPokemonData = null;
let statsChart = null; // Store chart instance for cleanup

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
        for (const poke of paginatedList) {
            const pokeData = await fetch(poke.url).then(res => res.json());
            displayPokemon(pokeData, container);
        }
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

// Display a single Pokémon card with type icons
function displayPokemon(data, container) {
    const pokemonCard = document.createElement('div');
    pokemonCard.classList.add('pokemon-card');
    pokemonCard.onclick = () => showPokemonDetails(data);

    const primaryType = data.types[0].type.name;
    pokemonCard.classList.add(primaryType);

    const img = document.createElement('img');
    img.src = data.sprites.front_default || 'https://via.placeholder.com/130';
    img.alt = `${data.name} sprite`;
    pokemonCard.appendChild(img);

    const name = document.createElement('h2');
    name.textContent = data.name;
    data.types.forEach(type => {
        const icon = document.createElement('span');
        icon.classList.add('type-icon', type.type.name);
        name.appendChild(icon);
    });
    pokemonCard.appendChild(name);

    const types = document.createElement('p');
    types.textContent = data.types.map(type => type.type.name).join(', ');
    pokemonCard.appendChild(types);

    const stats = document.createElement('p');
    stats.textContent = `HP: ${data.stats[0].base_stat} | Atk: ${data.stats[1].base_stat}`;
    pokemonCard.appendChild(stats);

    container.appendChild(pokemonCard);
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
        current = current.evolves_to.length > 0 ? current.evolves_to[0] : null; // Take first evolution path
    }

    return evolutions;
}

// Show detailed view in modal with stats chart and evolution chain
async function showPokemonDetails(data) {
    const modal = document.getElementById('pokemonModal');
    const modalContent = document.getElementById('modalContent');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const playCryBtn = document.getElementById('playCryBtn');
    modalContent.innerHTML = '';

    currentPokemonData = data;

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

    // Stats Chart
    const canvas = document.createElement('canvas');
    canvas.classList.add('stats-chart');
    modalContent.appendChild(canvas);

    if (statsChart) statsChart.destroy(); // Destroy previous chart instance
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

    // Evolution Chain
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
                .then(newData => showPokemonDetails(newData));
        };

        evolutionDiv.appendChild(stageDiv);
    }
    modalContent.appendChild(evolutionDiv);

    const isFavorite = favorites.some(fav => fav.id === data.id);
    favoriteBtn.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    favoriteBtn.onclick = () => toggleFavorite(data);

    playCryBtn.onclick = () => playPokemonCry(data);

    modal.style.display = 'block';
    anime({
        targets: '.modal-content',
        opacity: [0, 1],
        translateY: [-100, 0],
        scale: [0.9, 1],
        duration: 600,
        easing: 'easeOutBounce'
    });
}

// Play Pokémon cry using PokéAPI latest cries
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
    showPokemonDetails(data);
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
    viewBtn.style.display = favorites.length > 0 || !favoritesVisible ? 'inline-block' : 'none';
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

// Modal close functionality with Anime.js
document.querySelector('.close').onclick = function() {
    if (statsChart) statsChart.destroy(); // Clean up chart
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
        if (statsChart) statsChart.destroy(); // Clean up chart
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

// Event listeners
window.onload = function() {
    populateTypeFilter();
    fetchAllPokemon();
    updateFavoritesControls();

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

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