
import { useState } from "react";
import { motion } from "framer-motion";
import "./CharacterSelect.css";

type Character = {
  id: string;
  name: string;
  image: string;
  height: string;
};

const characters: Character[] = [
  {
    id: "irene",
    name: "IRENE",
    image: "/assets/characters/irene.png",
    height: "100%",
  },
  {
    id: "iris",
    name: "IRIS",
    image: "/assets/characters/iris.png",
    height: "100%",
  },
  {
    id: "michelle",
    name: "MICHELLE",
    image: "/assets/characters/michelle.png",
    height: "88%",
  },
];

export default function CharacterSelect() {
  const [selected, setSelected] = useState("iris");

  const handleContinue = () => {
    console.log("Selected character:", selected);
  };

  return (
    <main className="character-screen">
      <div className="garden-background" />
      <div className="screen-overlay" />

      <header className="screen-header">

        <h1>CHOOSE YOUR HERO</h1>

        <p className="subtitle">
        </p>
      </header>

      <section className="character-stage">
        {characters.map((character, index) => {
          const isSelected = selected === character.id;

          return (
            <motion.button
              key={character.id}
              className={`character-option ${
                isSelected ? "selected" : ""
              }`}
              onClick={() => setSelected(character.id)}
              initial={{
                opacity: 0,
                y: 25,
                scale: 0.92,
              }}
              animate={{
                opacity: 1,
                y: isSelected ? -8 : 0,
                scale: isSelected ? 1.04 : 1,
              }}
              transition={{
                duration: 0.28,
                delay: index * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{
                scale: isSelected ? 1.07 : 1.04,
                y: -6,
                transition: {
                  duration: 0.12,
                  ease: "easeOut",
                },
              }}
              whileTap={{
                scale: 0.97,
                transition: { duration: 0.08 },
              }}
              aria-pressed={isSelected}
              aria-label={`Select ${character.name}`}
            >
              <div className="character-image-wrap">
                <img
                  src={character.image}
                  alt={character.name}
                  className="character-image"
                  style={{ height: character.height }}
                  draggable={false}
                />
              </div>

              <div className="character-name">
                <img
                    src="/assets/ui/wooden-nameplate.png"
                    alt=""
                    className="nameplate-image"
                />
                <span>{character.name}</span>
                </div>
            </motion.button>
          );
        })}
      </section>
        <footer className="screen-footer">
        <motion.button
            className="continue-button"
            onClick={handleContinue}
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Continue"
        >
            <img
            src="/assets/ui/continue-arrow.png"
            alt=""
            />
        </motion.button>
        </footer>
    </main>
  );
}