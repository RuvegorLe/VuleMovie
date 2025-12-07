import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";


export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // 🚨 BƯỚC SỬA 1: Lọc bỏ các show mà trường 'movie' là null
    const validShows = shows.filter(show => show.movie !== null);

    // Lấy danh sách unique movies từ các show hợp lệ
    const uniqueMovies = Array.from(
    // BƯỚC SỬA 2: Lặp qua mảng đã lọc (validShows)
      new Set(validShows.map((show) => show.movie._id.toString()))
    ).map((id) => validShows.find((show) => show.movie._id.toString() === id).movie);

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

// Chỉnh sửa show (chỉ admin)
export const updateShow = async (req, res) => {
    try {
        const { id } = req.params;
        const { showPrice, showDateTime } = req.body || {} ;

        if (!showPrice && !showDateTime) {
            return res.status(400).json({ success: false, message: "At least one field (showPrice or showDateTime) is required for update." });
        }

        const updateFields = {};
        if (showPrice) updateFields.showPrice = showPrice;
        if (showDateTime) updateFields.showDateTime = new Date(showDateTime);

        const updatedShow = await Show.findByIdAndUpdate(
            id,
            updateFields,
            { new: true } 
        ).populate("movie"); 

        if (!updatedShow) {
            return res.status(404).json({ success: false, message: "Show not found." });
        }

        res.json({ success: true, message: "Show updated successfully.", show: updatedShow });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during show update." });
    }
};

// Xoá show (chỉ admin)
export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params; 

    if (!id) {
      return res.status(400).json({ success: false, message: "Missing show ID" });
    }

    const result = await Show.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    res.json({ success: true, message: "Show deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error during show deletion." });
  }
};
