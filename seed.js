import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import Genre from "./models/Genre.js";
import Movie from "./models/Movie.js";

dotenv.config();

const FRESH = process.argv.includes("--fresh");

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Thriller",
];

const USERS = [
  {
    username: "admin",
    email: "admin@movies.local",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
    isAdmin: true,
  },
  {
    username: "moviebuff",
    email: "user@movies.local",
    password: process.env.SEED_USER_PASSWORD || "User@12345",
    isAdmin: false,
  },
];

// No poster files exist on a fresh uploads volume, so seed rows point at a
// remote placeholder instead of /uploads (which nginx does not proxy).
const poster = (name) =>
  `https://placehold.co/400x600/1f2937/f9fafb?text=${encodeURIComponent(name)}`;

const MOVIES = [
  {
    name: "Mad Max: Fury Road",
    year: 2015,
    genre: "Action",
    detail:
      "On a post-apocalyptic desert highway, a drifter and a rogue commander flee a warlord's army in a relentless convoy chase.",
    cast: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult"],
  },
  {
    name: "Inception",
    year: 2010,
    genre: "Sci-Fi",
    detail:
      "A thief who steals secrets from inside dreams is offered a way home if he can plant an idea in a target's mind instead.",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
  },
  {
    name: "Spirited Away",
    year: 2001,
    genre: "Animation",
    detail:
      "A sullen ten-year-old girl wanders into a world of spirits and must work in a bathhouse to free her parents from a curse.",
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki"],
  },
  {
    name: "The Grand Budapest Hotel",
    year: 2014,
    genre: "Comedy",
    detail:
      "A legendary concierge and his trusted lobby boy are drawn into the theft of a priceless painting and a battle over a family fortune.",
    cast: ["Ralph Fiennes", "Tony Revolori", "Saoirse Ronan"],
  },
  {
    name: "Parasite",
    year: 2019,
    genre: "Thriller",
    detail:
      "A struggling family talks its way into the employ of a wealthy household, and the arrangement curdles in ways nobody can control.",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"],
  },
  {
    name: "Heat",
    year: 1995,
    genre: "Crime",
    detail:
      "A career thief planning one last score and the obsessive detective tracking him circle each other across Los Angeles.",
    cast: ["Al Pacino", "Robert De Niro", "Val Kilmer"],
  },
  {
    name: "Hereditary",
    year: 2018,
    genre: "Horror",
    detail:
      "After the death of her secretive mother, a miniature artist's family begins to unravel a legacy they were never meant to inherit.",
    cast: ["Toni Collette", "Alex Wolff", "Milly Shapiro"],
  },
  {
    name: "The Shawshank Redemption",
    year: 1994,
    genre: "Drama",
    detail:
      "A wrongly convicted banker builds an unlikely friendship and a long, patient plan inside the walls of Shawshank prison.",
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
  },
  {
    name: "Before Sunrise",
    year: 1995,
    genre: "Romance",
    detail:
      "Two strangers meet on a train to Vienna and spend a single night walking the city, talking their way toward morning.",
    cast: ["Ethan Hawke", "Julie Delpy"],
  },
  {
    name: "Raiders of the Lost Ark",
    year: 1981,
    genre: "Adventure",
    detail:
      "An archaeologist races Nazi agents across three continents to recover the Ark of the Covenant before they can weaponize it.",
    cast: ["Harrison Ford", "Karen Allen", "Paul Freeman"],
  },
];

const REVIEWS = {
  "Mad Max: Fury Road": [
    { author: "moviebuff", rating: 5, comment: "Two hours of pure momentum. The practical stunts still hold up." },
    { author: "admin", rating: 4, comment: "Thin on dialogue, enormous on craft." },
  ],
  Inception: [
    { author: "moviebuff", rating: 5, comment: "The layered heist structure rewards a second viewing." },
  ],
  Parasite: [
    { author: "admin", rating: 5, comment: "Shifts genre three times and never loses its footing." },
    { author: "moviebuff", rating: 5, comment: "The staircase blocking alone is worth the watch." },
  ],
  "Spirited Away": [
    { author: "moviebuff", rating: 5, comment: "Every frame is doing something. Endlessly rewatchable." },
  ],
  "The Shawshank Redemption": [
    { author: "admin", rating: 4, comment: "Sentimental in places, but the payoff earns it." },
  ],
};

const seedGenres = async () => {
  const byName = new Map();

  for (const name of GENRES) {
    const genre = await Genre.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { new: true, upsert: true }
    );
    byName.set(name, genre._id);
  }

  console.log(`Genres ready: ${byName.size}`);
  return byName;
};

const seedUsers = async () => {
  const byUsername = new Map();

  for (const { username, email, password, isAdmin } of USERS) {
    let user = await User.findOne({ email });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      user = await User.create({
        username,
        email,
        password: await bcrypt.hash(password, salt),
        isAdmin,
      });
      console.log(`Created user ${email}${isAdmin ? " (admin)" : ""}`);
    }

    byUsername.set(username, user._id);
  }

  return byUsername;
};

const seedMovies = async (genreIds, userIds) => {
  let created = 0;

  for (const movie of MOVIES) {
    const genre = genreIds.get(movie.genre);

    if (!genre) {
      console.warn(`Skipping "${movie.name}": unknown genre ${movie.genre}`);
      continue;
    }

    if (await Movie.findOne({ name: movie.name })) continue;

    const reviews = (REVIEWS[movie.name] || [])
      .filter((review) => userIds.has(review.author))
      .map((review) => ({
        name: review.author,
        rating: review.rating,
        comment: review.comment,
        user: userIds.get(review.author),
      }));

    await Movie.create({
      ...movie,
      genre,
      image: poster(movie.name),
      reviews,
      numReviews: reviews.length,
    });

    created += 1;
  }

  console.log(`Movies created: ${created} (total ${await Movie.countDocuments()})`);
};

const run = async () => {
  await connectDB();

  if (FRESH) {
    await Promise.all([
      Movie.deleteMany({}),
      Genre.deleteMany({}),
      User.deleteMany({}),
    ]);
    console.log("Cleared movies, genres and users");
  }

  const genreIds = await seedGenres();
  const userIds = await seedUsers();
  await seedMovies(genreIds, userIds);

  console.log("Seed complete 👍");
};

run()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
