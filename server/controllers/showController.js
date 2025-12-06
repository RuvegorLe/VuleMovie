import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

// Lấy tất cả show từ DB
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // Lấy danh sách unique movies
    const uniqueMovies = Array.from(
      new Set(shows.map((show) => show.movie._id))
    ).map((id) => shows.find((show) => show.movie._id === id).movie);

    res.json({ success: true, shows: uniqueMovies });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Lấy thông tin 1 show theo movieId
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Thêm show mới (chỉ admin)
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);
if (!movie) {
  return res.status(400).json({ success: false, message: "Movie not found in database" });
}

   

    // Tạo show
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: "Show added successfully." });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
