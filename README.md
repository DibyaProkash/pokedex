# Game Boy Pokédex

![Pokédex Front Page](assets/screenshots/pokedex.png?raw=true "Pokédex Front Page")

A retro-inspired Pokédex web app styled like a classic Game Boy, built with HTML, CSS, and JavaScript. Powered by the [PokéAPI](https://pokeapi.co/), it lets you explore Pokémon, catch them in wild encounters, toggle shiny sprites, and enjoy chiptune music—all wrapped in a nostalgic 8-bit aesthetic.

## Features
- **Game Boy Aesthetic:** Pixelated frame, 8-bit font, and monochrome toggle for that Red/Blue vibe.
- **Pokémon Exploration:** Search by name/ID, filter by type, sort by ID/name, and browse with pagination.
- **Interactive Cards:** Flip cards to view stats, toggle shiny sprites, and play Pokémon cries.
- **Wild Encounters:** Catch Pokémon with a retro Poké Ball animation and sound effect.
- **Favorites & Caught Lists:** Save favorites and track caught Pokémon, stored locally.
- **Music Player:** Play classic Pokémon tracks with play/pause controls.
- **Dark Mode:** Toggle between light and dark themes.
- **Responsive Design:** Adapts to all screen sizes, from desktop to mobile.

## Demo
Check out the live demo [here](https://dibyaprokash.github.io/pokedex/).

## Screenshots

| Main Screen | Wild Encounter    | Pokémon Details    |
| :---:   | :---: | :---: |
| ![Pokédex Front Page](assets/screenshots/pokedex.png?raw=true "Pokédex Front Page") |  ![Wild Pokémon](assets/screenshots/wild-pokemon.png?raw=true "Wild Pokémon")  | ![Pokémon Details](assets/screenshots/pokemon-details.png?raw=true "Pokémon Details")   |

## Usage
1. Explore Pokémon:
   - Type a name/ID in the search bar or browse the list.
   - Use type/sort filters and pagination (D-Pad or buttons).

2. Interact with Cards:
   - Hover to flip cards for stats.
   - Click the star for shiny sprites, speaker for cries, or Poké Ball to mark as caught.

3. Wild Encounters:
   - Click "Encounter Wild Pokémon" to catch a random Pokémon with a 10-second timer.
  
4. Manage Lists:
   - View and clear favorites or caught Pokémon via the buttons below.
  
5. Retro Features:
    - Toggle monochrome mode for a Game Boy screen effect.
    - Play music tracks and use the D-Pad (left/right for pagination).

## Code Overview
- `index.html`: Structure with Game Boy frame, search controls, and modal.

- `styles.css`: Retro styling with pixelated borders, 8-bit font, and responsive layouts.

- `script.js`: Logic for API calls, animations, local storage, and audio handling.

## Key Technologies
- **HTML5:** Semantic markup and audio elements.
- **CSS3:** Flexbox, animations, and media queries.
- **JavaScript:** Fetch API, DOM manipulation, and event handling.
- **PokéAPI:** Data source for Pokémon details.

Contributing
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/awesome-idea`).
3. Commit changes (`git commit -m "Add awesome idea"`).
4. Push to the branch (`git push origin feature/awesome-idea`).
5. Open a pull request.

## Credits
- **Designed by:** [Dibya Prokash Sarkar](https://dibyaprokash.github.io/)
- **Data:** [PokéAPI](https://pokeapi.co/)
- **Audio:** Sourced and downloaded from [Khinsider](https://downloads.khinsider.com/game-soundtracks/album/pokemon-ruby-sapphire-music-super-complete)
- **Font:** [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)